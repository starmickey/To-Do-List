const mongoose = require("mongoose");
const lodash = require("lodash");


/* ========= CONNECT TO DATABASE ========= */

connectMongoose().catch(err => console.log(err));

async function connectMongoose() {
    const DATABASE_NAME = "todolistDB";
    mongoose.set("strictQuery", false);
    await mongoose.connect('mongodb://127.0.0.1:27017/' + DATABASE_NAME);
    console.log("mongoose connection established succesfully");
}


/* ======= CREATE MODELS AND SCHEMAS ======= */

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    password: {
        type: String,
        required: true
    },
    email: String,
    rmDate: {
        type: Date,
        default: null
    }
});

const User = new mongoose.model('user', userSchema);


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
    user: {
        type: userSchema,
        required: true
    }
});

const List = new mongoose.model('List', listSchema);


const itemSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
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


const LogInStatus = {
    loggedin: 0,
    userNotFound: 1,
    error: 2
}

exports.LogInStatus = LogInStatus;



/* ==== CREATE DTO CONSTRUCTORS AND EXPORTS ==== */

class UserDTO {
    constructor(id, name, status) {
        this.id = String(id);
        this.name = String(name);
        this.status = status;
    }
}

class ListDTO {
    constructor(id, name, userId, date, items, status) {
        this.id = String(id);
        this.name = String(name);
        this.userId = String(userId);
        this.date = date;
        this.items = items;
        this.status = status;
    }
}

class ItemDTO {
    constructor(id, name, status) {
        this.id = String(id);
        this.name = String(name);
        this.status = status;
    }
}

// Private constructors

function listToListDTO(list) {
    return new Promise((resolve, reject) => {
        const itemDTOs = [];

        Item.find({ list: list }, function (error, items) {

            if (error) {
                reject(error);

            } else {
                items.forEach(item => {
                    itemDTOs.push(itemToItemDTO(item));
                });

                resolve(new ListDTO(list.id, list.name, list.user.id,
                    list.date, itemDTOs, DTOStatus.unmodified));
            }
        });
    })
}

function itemToItemDTO(item) {
    return new ItemDTO(item.id, item.name, DTOStatus.unmodified);
}


// Export DTO constructors

function createListDTO(name, userId, date, items) {
    return new ListDTO('', lodash.lowerCase(name), userId, date, items, DTOStatus.new);
}

function createItemDTO(name) {
    return new ItemDTO('', name, DTOStatus.new);
}

function addItemDTOToListDTO(listDTO, itemDTO) {
    listDTO.items.push(itemDTO);
    listDTO.status = DTOStatus.modified;
    return listDTO;
}

function removeItemDTOFromListDTO(listDTO, itemDTO) {
    let index = 0;
    let found = false;

    while (index < listDTO.items.length && !found) {
        let item = listDTO.items[index];

        if (item.name === itemDTO.name && item.status !== DTOStatus.removed) {
            found = true;
            listDTO.items[index].status = DTOStatus.removed;
            listDTO.status = DTOStatus.modified;
        }

        index++;
    }

    return listDTO;
}

exports.createListDTO = createListDTO;
exports.createItemDTO = createItemDTO;
exports.addItemDTOToListDTO = addItemDTOToListDTO;
exports.removeItemDTOFromListDTO = removeItemDTOFromListDTO;




/* ===== EXPORT CRUD OPERATIONS ===== */

function getUser(name, password) {

    return new Promise((resolve, reject) => {

        User.findOne({ name: name, password: password, rmDate: null }, function (error, user) {

            if (error) {
                resolve(new UserDTO('', name, LogInStatus.error));

            } else if (user === null) {
                resolve(new UserDTO('', name, LogInStatus.userNotFound));

            } else {
                resolve(new UserDTO(user.id, user.name, LogInStatus.loggedin));

            }
        })
    });
}



function getAllUserLists(userDTO) {

    return new Promise((resolve, reject) => {

        User.findOne({ _id: userDTO.id, rmDate: null }, function (userError, user) {

            if (userError) {
                reject(userError);

            } else if (user === null) {
                reject('user ' + userDTO.name + 'not found');

            } else {
                const listDTOs = [];

                List.find({ user: user, rmDate: null }, function (listError, lists) {

                    if (listError) {
                        reject(listError);

                    } else {
                        const listPromises = [];

                        lists.forEach(list => {
                            listPromises.push(listToListDTO(list).then(function (listDTO) {
                                listDTOs.push(listDTO);
                            }));
                        });

                        Promise.all(listPromises).then(function () {
                            resolve(listDTOs);
                        });
                    }

                });
            }
        });
    });
}


function getListById(listId) {

    return new Promise((resolve, reject) => {

        List.find({ _id: listId, rmDate: null }, function (listError, lists) {

            if (listError) {
                reject(listError);

            } else if (lists.length === 0) {
                console.log("list " + listName + " not found");

                resolve(null);

            } else {
                let list = lists[0];

                Item.find({ list: list, rmDate: null }, function (itemError, items) {

                    if (itemError) {
                        reject(itemError);

                    } else {

                        listToListDTO(list).then(function (listDTO) {
                            resolve(listDTO);
                        });
                    }

                });

            }

        });

    })

}


function saveList(listDTO) {

    return new Promise((resolve, reject) => {
        if (listDTO.status === DTOStatus.new) {
            console.log('creating list');
            createList(listDTO).then(function (listDTO) {
                resolve(listDTO);
            });

        } else if (listDTO.status === DTOStatus.modified) {
            console.log('modifying list');
            modifyList(listDTO).then(function (listDTO) {
                resolve(listDTO);
            });

        } else if (listDTO.status === DTOStatus.removed) {
            console.log('removing list');
            removeList(listDTO).then(function (listDTO) {
                resolve(listDTO);
            });
        }

    })
}

/* Exports */

exports.getUser = getUser;
exports.getAllUserLists = getAllUserLists;
exports.getListById = getListById;
exports.saveList = saveList;




/* === SAVE LIST AUXILIARY OPERATIONS === */

function createList(listDTO) {

    return new Promise((resolve, reject) => {

        User.findOne({ _id: listDTO.userId, rmDate: null }, function (userError, user) {

            if (userError) {
                reject(userError);

            } else if (user === null) {
                reject('user not found: id ' + listDTO.userId);

            } else {
                const list = new List({ name: listDTO.name, date: listDTO.date, user: user });

                Promise.all([list.save()]).then(function () {

                    listDTO.items.forEach(itemDTO => {
                        const item = new Item({ name: itemDTO.name, list: list });
                        item.save().then(function () {
                            console.log("Item created: " + item.name);
                        });
                    });

                    console.log('list created: ' + list.name);
                    resolve(listToListDTO(list));
                });

            }

        });
    })

}


function modifyList(listDTO) {

    return new Promise((resolve, reject) => {

        List.findOne({ _id: listDTO.id, rmDate: null }, function (err, list) {

            if (err) {
                console.log(err);
                reject(err);

            } else if (list === null) {
                console.log('list not found');
                reject("list " + listDTO.name + " not found");

            } else {

                list.name = listDTO.name;
                list.date = listDTO.date;

                const itemPromises = [];

                listDTO.items.forEach(itemDTO => {

                    if (itemDTO.status === DTOStatus.new) {

                        const item = new Item({
                            name: itemDTO.name,
                            list: list
                        });

                        itemPromises.push(item.save());
                        console.log('Item created: ' + item.name);


                    } else if (itemDTO.status === DTOStatus.modified
                        || itemDTO.status === DTOStatus.removed) {

                        Item.findOne({ _id: itemDTO.id, rmDate: null }, function (err, item) {

                            if (err) {
                                reject(err);

                            } else if (item === null) {
                                reject('item ' + itemDTO.name + ' not found.');

                            } else {

                                if (itemDTO.status === DTOStatus.modified) {
                                    item.name = itemDTO.name;
                                    console.log("item modified: " + item.name);

                                } else if (itemDTO.status === DTOStatus.removed) {
                                    item.rmDate = new Date();
                                    console.log("item removed: " + item.name);
                                }

                                itemPromises.push(item.save());

                            }
                        });
                    }
                });

                Promise.all(itemPromises).then(function () {
                    listToListDTO(list).then(function (listDTO) {
                        resolve(listDTO);
                    })
                });

            }
        });
    })
}


function removeList(listDTO) {

    return new Promise((resolve, reject) => {

        List.findOne({ _id: listDTO.id, rmDate: null }, function (err, list) {

            if (err) {
                console.log(err);
                reject(err);

            } else if (list === null) {
                console.log('list not found');
                reject("list " + listDTO.name + " not found");

            } else {
                list.rmDate = new Date();
                console.log("list " + listDTO.name + " was removed");

                list.save().then(function () {
                    resolve(null);
                })
            }
        });
    });

}


/* ===== NOT DB TRANSACTIONAL EXPORT OPERATIONS ==== */

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

// const testUser = new User({name: 'test', password: 'test'});
// testUser.save();

// const testUser = User.findOne({name: 'test'}, function(err, user){
//     // console.log(user);
//     const testList = new List({name: 'listaprueba', date: new Date(), user: user});
//     testList.save().then(function(list){
//         console.log(list);
//     });
// });

// List.findOne({name: 'listaprueba'}, function(err, list){
// const testItem = new Item({name: 'testItem2', list: list});
// testItem.save();
// })




/* TEST TRANSACTIONS */


// getUser('test', 'test').then(function (userDTO) {
//     if (userDTO.status === LogInStatus.loggedin) {
//         let listDTO = createListDTO('testList4', userDTO.id, new Date(), []);
//         listDTO = addItemDTOToListDTO(listDTO, createItemDTO('pear'));
//         listDTO = addItemDTOToListDTO(listDTO, createItemDTO('pear'));
//         listDTO = addItemDTOToListDTO(listDTO, createItemDTO('orange'));
//         listDTO = removeItemDTOFromListDTO(listDTO, itemDTO);
//         console.log(listDTO);

//         // saveList(listDTO).then(function (listDTO) {
//             // console.log(listDTO);
//         // });

//         // getAllUserLists(userDTO).then(function(listDTOs){
//             // console.log(listDTOs);
//         // });

        // getListById("63dea94872f2e6d223ebc53e").then(function(listDTO){
                // console.log(listDTO);
        // });
    // }
// }); 


