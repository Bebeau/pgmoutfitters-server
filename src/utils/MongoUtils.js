const mongoose = require('mongoose');
const config = require('../../config/keys');

class MongoUtils {
	static connect() {
    return new Promise((resolve, reject) => {
      mongoose.set("strictQuery", false);
      mongoose.connect(config.db, { useNewUrlParser: true, }, (err) => {
        if (err) {
          console.log("Error Connecting to MongoDB...");
          return reject(err);
        }
        console.log("Successfully Connected to MongoDB");
        resolve();
      });
    });
  }
}

module.exports = MongoUtils;