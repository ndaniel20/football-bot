const mongoose = require('mongoose');
require('dotenv').config();
const MONGODB_URI = process.env.DB_URI;

class Database {
	constructor() {
		this.connection = null;
	} 

	connect () {
		console.log('Connecting to database...');
    mongoose.set('strictQuery', false)
		mongoose.connect(MONGODB_URI, {
			useNewUrlParser: true,
			useUnifiedTopology: true,
		}).then(() => {
			console.log('Connected to database');
			console.log('---------------------------------');
			this.connection = mongoose.connection;
		}).catch(err => {
			console.error(err);
		});
	}
}

module.exports = Database;