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
    },
    rmDate: {
        type: Date,
        default: null
    }
});

const ListType = new mongoose.model('ListType', listTypeSchema);


const listSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    date: Date,
    rmDate: {
        type: Date,
        default: null
    },
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
    rmDate: {
        type: Date,
        default: null
    },
    list: {
        type: listSchema,
        required: true
    }
});

const Item = new mongoose.model('Item', itemSchema);



/* ==== CREATE DTO CONSTRUCTORS AND EXPORTS ==== */

class ItemDTO {
    constructor(id, name, checked) {
        this.id = String(id);
        this.name = String(name);
        this.checked = Boolean(checked);
    }
}

exports.ItemDTO = ItemDTO;



class ListDTO {
    constructor(id, name, date, listType, items) {
        this.id = String(id);
        this.name = String(name);
        this.date = date;
        this.listType = String(listType);
        this.items = items;
    }
}

exports.ListDTO = ListDTO;


class ListTypeDTO {
    constructor(id, name) {
        this.id = String(id);
        this.name = String(name);
    }
}

exports.ListTypeDTO = ListTypeDTO;



/* ===== DATABASE CRUD OPERATIONS ===== */

getListByName = function (listName) {

    let listDTO;
    let itemsDTO = [];

    return new Promise((res, rej) => {
       
        List.findOne({ name: listName }, function (err, list) {
            if (err) {
                rej(err);
            } else if(list === null) {
                rej("list " + listName + " not found");
            } else {
                const itemPromise = new Promise((resolve, reject) => {
                    Item.find({ list: list }, function (error, items) {
                        if (error) {
                            reject(error);
                        } else {
                            items.forEach(item => {
                                itemsDTO.push(new ItemDTO(item.id, item.name, item.checked));
                            });
                        }

                        resolve(itemsDTO);
                    });
                });

                itemPromise.then(function (itemsDTO) {
                    listDTO = new ListDTO(list.id, list.name, list.date, list.listType.name, itemsDTO);
                    res(listDTO);
                });
            }
        });

    });
}


saveList = function (listDTO) {
    return new Promise((resolve, reject) => {

        ListType.findOne({ name: listDTO.listType }, function (err, listType) {
            if (err) {
                reject(err);
            } else if (listType === null) {
                reject("list type " + listDTO.listType + " not found.");
            } else {
                const list = new List({ name: listDTO.name, date: listDTO.date, listType: listType });
                Promise.all([list.save()]).then(function () {
                    console.log('list saved: ' + list.name);
    
                    listDTO.items.forEach(itemDTO => {
                        const item = new Item({ name: itemDTO.name, ckecked: itemDTO.checked, list: list });
                        item.save();
                        resolve("Item saved: " + item.name);
                    });
                });
            }
        });

    })
}


addItemToList = function (listDTO, itemDTO) {
    return new Promise((resolve, reject) => {
        
        List.findOne({ _id: listDTO.id }, function (err, list) {
            if (err) {
                reject(err);
            } else if (list === null) {
                reject('List ' + listDTO.name + ' not found.');
            } else {
                const item = new Item({name: itemDTO.name, ckecked: itemDTO.checked, list: list});
                item.save();
                resolve('Item saved: ' + item.name);
            }
        })

    });
}


removeItemFromList = function (itemDTO) {
    
    return new Promise((resolve, reject) => {
        Item.findOne({ _id: itemDTO.id }, function(err, item){
            if (err) {
                reject(err);
            } else if (item === null) {
                reject('item ' + itemDTO.name + ' not found.');
            } else if (item.rmDate !== null){
                reject('item ' + item.name + ' was already removed.');
            } else {
                item.rmDate = new Date();
                Promise.all([item.save()], function (result) {
                    resolve('item ' + item.name + ' removed.');
                });
            }
        });
        
    })

}



getStringDate = function (date) {

    const options = {
        weekday: "long",
        day: "numeric",
        month: "long"
    };

    return date.toLocaleDateString("en-US", options);

};




/* TEST TRANSACTIONS */

/* List.findOne({name: getStringDate(new Date())}, function (err, list) {
    if (err) {
        console.log(err);
    } else {
        console.log(list.name);
    }
}); */


let listDTOsample = getListByName("Wednesday, February 1");

listDTOsample.then(function (value) {
    // const itemDTO = new ItemDTO('', 'vanilla2', false);
    // addItemToList(value, itemDTO);
    rm = removeItemFromList(value.items[value.items.length - 1]);
    rm.then(function (ret) {
        console.log(rm);
    })
})

/* 
const today = new Date();
const items = [
    new ItemDTO('', 'get lists function', true),
    new ItemDTO('', 'save lists function', false),
];
const listDTO = new ListDTO("", getStringDate(today), today, 'dayList', items);
saveList(listDTO); */