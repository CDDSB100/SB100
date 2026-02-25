const { getCuratedArticles } = require("./src/services/api_logic.js");

async function test() {
  try {
    console.log("Testing getCuratedArticles...");
    const articles = await getCuratedArticles();
    console.log(`Success! Fetched ${articles.length} articles.`);
    if (articles.length > 0) {
      console.log("First article sample:", JSON.stringify(articles[0], null, 2).substring(0, 500));
    }
  } catch (err) {
    console.error("Test failed with error:");
    console.error(err.message);
    console.error(err.stack);
  } finally {
    process.exit();
  }
}

test();
