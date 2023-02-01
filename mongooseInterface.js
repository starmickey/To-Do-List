const mongoose = require("mongoose");


/* ========= CONNECT TO DATABASE ========= */

connectMongoose().catch(err => console.log(err));

async function connectMongoose() {
  const DATABASE_NAME = "todolistDB";
  mongoose.set("strictQuery", false);
  await mongoose.connect('mongodb://127.0.0.1:27017/' + DATABASE_NAME);
}


/* ======= CREATE MODELS AND SCHEMAS ======= */

const listTypeSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    }
});

const ListType = new mongoose.model('ListType', listTypeSchema);


const listSchema = new mongoose.Schema({
  name: {
    type: String, 
    required: true
  },
  date: Date,
  listType: {
    type: listTypeSchema,
    required: true
  }
});

const List = new mongoose.model('List', listSchema);


const itemSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  checked: {
    type: Boolean,
    default: false
  },
  list: {
    type: listSchema,
    required: true
  }
});

const Item = new mongoose.model('Item', itemSchema);



/* ===== EXPORT OPERATIONS ===== */

exports.addItemToList = function (itemName, listName) {
    
    List.findOne({name: listName}, function (err, list) {
        if (err) {
            console.log(err);
        } else {
            const item = new Item({name: itemName, list: list});
            item.save();
            console.log("new item created: " + item.name + " list: " + item.list.name);
        }
    });

}


exports.createDateList = function (date) {

    ListType.findOne({name: 'dayList'}, function (err, listTypeFound) {
        if (err) {
            console.log(err);
        } else {
            const list = new List({name: getStringDate(date), date: date, listType: listTypeFound});
            list.save();
            console.log("List created: " + list.name);
        }
    });

}

exports.createPersonalList = function (listName) {

    ListType.findOne({name: 'personalList'}, function (err, listTypeFound) {
        if (err) {
            console.log(err);
        } else {
            const list = new List({name: listName, listType: listTypeFound});
            list.save();
            console.log("List created: " + list.name);
        }
    });

}


exports.getStringDate = function (date) {

    const options = {
      weekday: "long",
      day: "numeric",
      month: "long"
    };
  
    return date.toLocaleDateString("en-US", options);

};



/* TEST TRANSACTIONS */

// addItemToList("Buy food", getStringDate(new Date()));

/* List.findOne({name: getStringDate(new Date())}, function (err, list) {
    if (err) {
        console.log(err);
    } else {
        console.log(list.name);
    }
}); */

// createDateList(new Date());