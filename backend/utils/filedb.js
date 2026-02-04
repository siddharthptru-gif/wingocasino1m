const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '../../database/data');

// Ensure database directory exists
if (!fs.existsSync(DB_PATH)) {
    fs.mkdirSync(DB_PATH, { recursive: true });
}

// Helper function to read JSON file
function readDB(collection) {
    const filePath = path.join(DB_PATH, `${collection}.json`);
    if (!fs.existsSync(filePath)) {
        return [];
    }
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
}

// Helper function to write JSON file
function writeDB(collection, data) {
    const filePath = path.join(DB_PATH, `${collection}.json`);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}

// Database operations
const FileDB = {
    // Find all documents
    find: (collection, query = {}) => {
        const data = readDB(collection);
        if (Object.keys(query).length === 0) {
            return data;
        }
        return data.filter(item => {
            return Object.keys(query).every(key => item[key] === query[key]);
        });
    },

    // Find one document
    findOne: (collection, query) => {
        const data = readDB(collection);
        return data.find(item => {
            return Object.keys(query).every(key => item[key] === query[key]);
        });
    },

    // Find by ID
    findById: (collection, id) => {
        const data = readDB(collection);
        return data.find(item => item._id === id || item.id === id);
    },

    // Insert document
    insert: (collection, doc) => {
        const data = readDB(collection);
        doc._id = doc._id || Date.now().toString() + Math.random().toString(36);
        doc.createdAt = doc.createdAt || new Date().toISOString();
        data.push(doc);
        writeDB(collection, data);
        return doc;
    },

    // Update document
    update: (collection, query, updates) => {
        const data = readDB(collection);
        const index = data.findIndex(item => {
            return Object.keys(query).every(key => item[key] === query[key]);
        });
        if (index !== -1) {
            data[index] = { ...data[index], ...updates, updatedAt: new Date().toISOString() };
            writeDB(collection, data);
            return data[index];
        }
        return null;
    },

    // Update by ID
    updateById: (collection, id, updates) => {
        const data = readDB(collection);
        const index = data.findIndex(item => item._id === id || item.id === id);
        if (index !== -1) {
            data[index] = { ...data[index], ...updates, updatedAt: new Date().toISOString() };
            writeDB(collection, data);
            return data[index];
        }
        return null;
    },

    // Delete document
    delete: (collection, query) => {
        const data = readDB(collection);
        const filtered = data.filter(item => {
            return !Object.keys(query).every(key => item[key] === query[key]);
        });
        writeDB(collection, filtered);
        return data.length - filtered.length;
    }
};

module.exports = FileDB;