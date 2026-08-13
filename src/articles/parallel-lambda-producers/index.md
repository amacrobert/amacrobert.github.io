---
title: Scalable Batch Jobs on Lambda with Parallelized Producers
subtitle: Increase scalability and reduce processing time by separating batch jobs into producers and consumers, then parallelizing both.
description: How separating batch jobs into producers and consumers, then parallelizing both, can increase scalability and reduce processing time on AWS Lambda.
date: 2022-06-20
---

At <a href="http://mequilibrium.com/" target="_blank">meQuilibrium</a>, a SaaS resilience coaching platform, we
decided to move our 10+ microservices from EC2 instances to AWS Lambda. This has worked out great for us, but came
with unique challenges.

Many of these microservices include scheduled workloads for batch-processing large amounts of data. That’s easy
enough on an always-on server, but Lambda processes have a maximum 15-minute lifetime. If you don’t complete your
processing in 15 minutes, your workload times out. This limitation of Lambda turned out to be a blessing because it
forced us to implement a scalable and robust solution for our batch jobs.

The anatomy of batch jobs is generally 2 steps:

1. Get a set of data to process (often with a database query)
2. Process that data, using each element as the input for some process

Let’s take a look at the solution’s evolution.

## Initial solution: Process procedurally

As an example, imagine a batch process that bills users who are due for a monthly payment.

Using a long-running batch process, that might look something like this:

```python
# Step 1: get the data
users = getUsersWithPaymentDue()

# Step 2: process the data
for user in users:
    billUser(user)
```

This presents a scalability issue. As your business grows and you accept more paying customers, the time it takes to
run increases linearly (`O(n)`). If it takes 300ms to run billUser(), the most users you can bill in a Lambda’s
lifetime are 3,000 — likely less due to overhead.

## Better solution: Use a queue as a buffer

The next logical step is to separate the two steps of a batch job. Step 1 (get the data) and step 2 (process the
data) can be separated respectively into a producer and consumer. Using an SQS queue as a trigger, Lambda will scale
the consumer automatically as needed. That solution looks like this:

Step 1: The producer gets all the users due for payment, and publishes an SQS message for each user:

```python
# PRODUCER
users = getUsersWithPaymentDue()
for user in users:
    publishToQueue(user)
```

Step 2: Independently, the consumer reads from the queue and dedicates a single invocation for each user billed.

```python
# CONSUMER
user = receiveFromQueue()
billUser(user)
```

This is a step forward: The producer and consumer are now separate, replacing a bottleneck with a component that’s
free to scale horizontally as needed.

However, it still has a similar issue as before. Publishing to an SQS queue can take about 6ms. In our example, it
alleviates a lot of the pressure and allows us to go from processing 3,000 to 150,000 users (minus overhead). But if
you are processing more than 150,000 users, your producer will still run into Lambda’s 15-minute time limit while
populating your queue.

## Highly scalable: Parallelize the producer

To scale much further, you can parallelize both the producer and the consumer. AWS handles scaling the consumers. At
meQuilibrium, we scale the producers using a recursive divide-and-conquer algorithm that uses a Lambda function’s
invocation as the algorithm’s iteration. Here’s how that looks for the example:

First, the producer gets the batch job’s data as before. But instead of publishing one SQS message per user, it
arranges the data into payloads each with a maximum size of 256KB (SQS’s maximum message size before resorting to S3
to store messages). Then it publishes each of those payloads to SQS:

```python
users = getUsersWithPaymentDue()

while users.count > 0:
    payload = []
    while sizeInKB(payload) < 256 and users.count > 0:
        payload.push(users.pop())

    publishToQueue(payload)
```

Then, the consumer will be our recursive function. The base case will be when it receives a payload with a
manageable number of users to process, which we know it can do well within the 15-minute Lambda time limit. The
recursive case will be when the payload contains a larger amount of users, in which case it will divide the payload
into two smaller payloads each containing half of the original payload. Then it publishes just two SQS messages (one
for each payload) and exits.

```python
BASE_CASE = 100
users = receiveFromQueue()

# Base case: Process the users
if users.count < BASE_CASE:
    for user in users:
        billUser(user)

# Recursive case: Split the payload in 2
else:
    payload1 = firstHalf(users)
    payload2 = secondHalf(users)
    publishToQueue(payload1)
    publishToQueue(payload2)
```

Theoretically, if the data we’re using as our input are 8-byte user IDs, the maximum number of users we could
process with this method is 4.8 billion (minus some due to the producer’s overhead). At that point, we’d be limited
by memory, not time. It would also allow us to double the number of users we process while only increasing the
execution time by the duration of one base-case Lambda invocation. In actuality it would take longer, since AWS
limits Lambda function concurrency and increases that limit minute-by-minute as needed, rather than allocating all
available concurrency at once — but for most intents and purposes this algorithm `O(log(n))`.

## In practice

Here are a few additional considerations for implementation we’ve encountered at meQuilibrium:

### Developer experience

To ease development, we wrote an abstract “Parallel SQS Handler” class that can implement this algorithm for any
type of data set (not just user IDs) and handle the chunking of batch job data into 256KB payloads. Any developer
can extend this class for a new type of batch job and implement a handler for processing, with no need to understand
the underlying algorithm.

### Database loads

This architecture can easily move bottlenecks from your application code to your database (or other resources shared
by parallel consumers). It is important to make sure whatever underlying resources are used by your consumers are
ready to scale. For databases, utilize connection pooling and read replicas.

Additionally, you can protect your resources by setting an upper limit for your consumer’sconcurrency. On Lambda, do
this by setting the function’s reserved concurrency.

### Monitoring progress

One downfall to moving from procedural batch processing to parallel processing is that you lose some visibility — no
longer can you tell how far a batch job is simply by looking at, say, a progress bar in its output.

If this visibility is important to you, solve it like so:

1. When your producer gets its data, write the number of records somewhere (such as a redis cache ordatabase).
2. When your consumer processes a record, increase a counter somewhere.
3. In a UI, show the progress calculated from the above two numbers.

---

At meQuilibrium, we saw producer parallelization reduce batch job processing times from hours to minutes (or less).
It allowed us to move our microservices to Lambda without relying on external long-running processes, and
simultaneously remove bottlenecks, process jobs faster, and improve scalability.
