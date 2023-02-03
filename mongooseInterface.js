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



/* ================ CONSTRAINTS ================ */

const DTOStatus = {
    unmodified: 0,
    new: 1,
    modified: 2,
    removed: 3
}

exports.DTOStatus = DTOStatus;



/* ==== CREATE DTO CONSTRUCTORS AND EXPORTS ==== */

class ListTypeDTO {
    constructor(id, name) {
        this.id = String(id);
        this.name = String(name);
    }
}


class ListDTO {
    constructor(id, name, date, listType, items, status) {
        this.id = String(id);
        this.name = String(name);
        this.date = date;
        this.listType = String(listType);
        this.items = items;
        this.status = status;
    }
}



class ItemDTO {
    constructor(id, name, checked, status) {
        this.id = String(id);
        this.name = String(name);
        this.checked = Boolean(checked);
        this.status = status;
    }
}



// Export constructors

exports.createListDTO = function (name, date, listType, items) {
    return new ListDTO('', name, date, listType, items, DTOStatus.new);
}

exports.createItemDTO = function (name) {
    return new ItemDTO('', name, false, DTOStatus.new);
}



/* ===== DATABASE CRUD OPERATIONS ===== */

exports.getListByName = function (listName) {

    let listDTO;
    let itemsDTO = [];

    return new Promise((res, rej) => {

        List.find({ name: listName }, function (err, lists) {

            if (err) {
                rej(err);

            } else if (lists.length === 0) {
                console.log("list " + listName + " not found");
                res(undefined);

            } else {
                let listFound = false;

                lists.forEach(list => {

                    if (list.rmDate === null) {

                        listFound = true;

                        const itemPromise = new Promise((resolve, reject) => {

                            Item.find({ list: list }, function (error, items) {
                                if (error) {
                                    reject(error);

                                } else {
                                    items.forEach(item => {
                                        if (item.rmDate === null) {
                                            itemsDTO.push(new ItemDTO(item.id, item.name, item.checked,
                                                DTOStatus.unmodified));
                                        }
                                    });
                                }

                                resolve(itemsDTO);

                            });
                        });

                        itemPromise.then(function (itemsDTO) {
                            listDTO = new ListDTO(list.id, list.name, list.date,
                                list.listType.name, itemsDTO, DTOStatus.unmodified);
                            res(listDTO);
                        });
                    }

                });

                if (!listFound) {
                    console.log("list " + listName + " was removed");
                    rej("list " + listName + " was removed");
                }
            }

        });

    });
}


exports.saveList = function (listDTO) {

    if (listDTO.status === DTOStatus.new) {
        console.log('creating list');
        createList(listDTO);

    } else if (listDTO.status === DTOStatus.modified) {
        console.log('modifying list');
        modifyList(listDTO);

    } else if (listDTO.status === DTOStatus.removed) {
        console.log('removing list');
        removeList(listDTO);
    }

}


function createList(listDTO) {

    return new Promise((resolve, reject) => {

        ListType.find({ name: listDTO.listType }, function (err, listTypes) {

            if (err) {
                reject(err);

            } else if (listTypes.length === 0) {
                reject("list type " + listDTO.listType + " not found.");

            } else {
                let listType;

                listTypes.forEach(lt => {
                    if (lt.rmDate === null) {
                        listType = lt;
                    }
                });

                if (listType === null) {
                    reject("list type " + listDTO.listType + " not found.");
                }

                const list = new List({ name: listDTO.name, date: listDTO.date, listType: listType });


                Promise.all([list.save()]).then(function () {

                    console.log('list created: ' + list.name);

                    listDTO.items.forEach(itemDTO => {

                        const item = new Item({
                            name: itemDTO.name,
                            ckecked: itemDTO.checked,
                            list: list
                        });

                        item.save();
                        console.log("Item created: " + item.name);

                    });

                    resolve('list created: ' + list.name);
                });
            }
        });

    })
}


function modifyList(listDTO) {

    return new Promise((resolve, reject) => {

        List.findOne({ _id: listDTO.id }, function (err, list) {

            if (err) {
                console.log(err);
                reject(err);

            } else if (list === null) {
                console.log('list not found');
                reject("list " + listDTO.name + " not found");

            } else if (list.rmDate !== null) {
                console.log('list was removed');
                reject("list " + listDTO.name + " was removed");

            } else {

                list.name = listDTO.name;
                list.date = listDTO.date;

                listDTO.items.forEach(itemDTO => {

                    if (itemDTO.status === DTOStatus.new) {

                        const item = new Item({
                            name: itemDTO.name,
                            ckecked: itemDTO.checked,
                            list: list
                        });

                        item.save();
                        console.log('Item created: ' + item.name);
                        resolve('Item created: ' + item.name);


                    } else if (itemDTO.status === DTOStatus.modified
                        || itemDTO.status === DTOStatus.removed) {

                        Item.findOne({ _id: itemDTO.id }, function (err, item) {

                            if (err) {
                                reject(err);

                            } else if (item === null) {
                                reject('item ' + itemDTO.name + ' not found.');

                            } else if (item.rmDate !== null) {
                                reject('item ' + item.name + ' was been removed.');

                            } else {

                                if (itemDTO.status === DTOStatus.modified) {
                                    item.name = itemDTO.name;
                                    item.checked = itemDTO.checked;
                                    console.log("item modified: " + item.name);

                                } else if (itemDTO.status === DTOStatus.removed) {
                                    item.rmDate = new Date();
                                    console.log("item removed: " + item.name);

                                }

                                item.save();

                            }
                        });
                    }
                });
            }
        });
    })
}


removeList = function (listDTO) {
    return new Promise((resolve, reject) => {

        List.findOne({ _id: listDTO.id }, function (err, list) {

            if (err) {
                console.log(err);
                reject(err);

            } else if (list === null) {
                console.log('list not found');
                reject("list " + listDTO.name + " not found");

            } else if (list.rmDate !== null) {
                console.log('list was removed');
                reject("list " + listDTO.name + " was already removed");

            } else {
                list.rmDate = new Date();
                console.log("list " + listDTO.name + " was removed");

                Promise.all([list.save()]).then(function (value) {
                    resolve("list " + listDTO.name + " was removed");
                })
            }
        });
    });
}


function getStringDate(date) {

    const options = {
        weekday: "long",
        day: "numeric",
        month: "long"
    };

    return date.toLocaleDateString("en-US", options);

};

exports.getStringDate = getStringDate;




/* INITIALIZE DATABASE */

// let listTypes = [];
// listTypes.push(new ListType({name: 'daily'}));
// listTypes.push(new ListType({name: 'personal'}));
// listTypes.push(new ListType({name: 'test'}));

// listTypes.forEach(listType => {
//     listType.save();
// });





/* TEST TRANSACTIONS */

/* List.findOne({name: getStringDate(new Date())}, function (err, list) {
    if (err) {
        console.log(err);
    } else {
        console.log(list.name);
    }
}); */


// let listDTOsample = getListByName("Wednesday, February 1");
// let listDTOsample = getListByName(getStringDate(new Date()));

// listDTOsample.then(function (value) {
// console.log(value);
// const itemDTO = new ItemDTO('', 'vanilla3', false);
// addItemToList(value, itemDTO);
// rm = removeItemFromList(value.items[value.items.length - 1]);
// rm.then(function (ret) {
// console.log(rm);
// })
// })


// const today = new Date();
// const items = [
//     new ItemDTO('', 'create function for saving new lists', true),
//     new ItemDTO('', 'create function for adding items to the new list', true),
//     new ItemDTO('', 'create function for getting a list by its name', true),
//     new ItemDTO('', 'add new functions to app.js file', false)
// ];


// const listDTO = new ListDTO("", getStringDate(today), today, 'test', items, DTOStatus.new);
// const listDTO = new ListDTO("", 'test', today, 'test', items);
// saveList(listDTO);


/*
const items = [
    createItemDTO('pear'),
    createItemDTO('banana'),
    createItemDTO('peach'),
    createItemDTO('apple')
]

const list = createListDTO('fruits', new Date(), 'test', items);
saveList(list);
 */

// const newItem = createItemDTO('orange');
/* 
getListByName('fruits').then(function (list) {
    // list.items.push(newItem);
    list.status = DTOStatus.removed;
    // list.items[0].name = 'orange';
    // list.items[0].status = DTOStatus.removed; 

    // console.log(list);
    saveList(list);
});
 */

/* 
getListByName('fruits').then(function (list) {
    
   list.items.forEach(item => {
    console.log(item.name);
   }); 
});
 */

