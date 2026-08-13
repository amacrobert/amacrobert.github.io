const syntaxHighlight = require("@11ty/eleventy-plugin-syntaxhighlight");

module.exports = function (eleventyConfig) {
    eleventyConfig.addPlugin(syntaxHighlight);

    // Stylesheets, scripts, and images ship as-is, at the same URLs they had before.
    eleventyConfig.addPassthroughCopy("src/**/*.css");
    eleventyConfig.addPassthroughCopy("src/theme-toggle.js");
    eleventyConfig.addPassthroughCopy("src/**/*.{jpg,png,webp,svg}");

    // Articles, newest first. Driven by the `articles` tag applied in
    // src/articles/articles.11tydata.js.
    eleventyConfig.addCollection("articles", (collection) =>
        collection
            .getFilteredByTag("articles")
            .sort((a, b) => b.data.date - a.data.date || a.inputPath.localeCompare(b.inputPath))
    );

    eleventyConfig.addFilter("readableDate", (date) =>
        date.toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
            timeZone: "UTC",
        })
    );

    eleventyConfig.addFilter("isoDate", (date) => date.toISOString().slice(0, 10));

    return {
        dir: {
            input: "src",
            output: "_site",
            includes: "_includes",
            data: "_data",
        },
        markdownTemplateEngine: "njk",
        htmlTemplateEngine: "njk",
    };
};
