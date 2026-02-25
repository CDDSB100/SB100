const { getCuratedArticles } = require("./src/services/api_logic.js");

async function test() {
  try {
    const articles = await getCuratedArticles();
    console.log(`Fetched ${articles.length} articles.`);

    // Simulate user with restricted access
    const user = {
        username: "test_user",
        role: "cientometria",
        allowed_categories: ["BIOINSUMOS"]
    };

    console.log("Simulating filter for user...");
    const allowed = (Array.isArray(user.allowed_categories) 
        ? user.allowed_categories 
        : [user.allowed_categories]
      ).map(c => String(c).trim().toLowerCase());
      
    const filteredArticles = articles.filter(article => {
        const category = String(article["CATEGORIA"] || article["categoria"] || "").trim().toLowerCase();
        return allowed.some(a => a === category);
    });

    console.log(`Filtered to ${filteredArticles.length} articles.`);
    console.log("Success!");
  } catch (err) {
    console.error("Crash detected!");
    console.error(err.message);
    console.error(err.stack);
  } finally {
    process.exit();
  }
}

test();
