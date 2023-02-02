/*  ======== REQUIRE MODULES ======== */

const express = require("express");
const bodyParser = require("body-parser");
const { DTOStatus } = require("./mongooseInterface");
// const date = require(__dirname + "/date.js");
const mongoose = require(__dirname + "/mongooseInterface.js");



/* ======= CONFIG EXPRESS APP ======= */

const app = express();

app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));


/* AUXILIARY VARS AND METHODS */


// const AppStatus = {
//   start: 0,
//   updated: 1, 
//   saving_changes: 2
// }

let list;
let itemsNames = [];


function refreshList(reqListName) {

  return new Promise((resolve, reject) => {

    if (list === undefined || list.name !== reqListName) {

      mongoose.getListByName(reqListName).then(function (foundList) {

          list = foundList;
          itemsNames = [];

          list.items.forEach(item => {
            itemsNames.push(item.name);
          });

          resolve('list refreshed');

      });

    } else {
      resolve("list wash't refreshed");
    }

  })


}

/* ====== APP EVENTS' HANDLERS ====== */

app.get("/", function (req, res) {

  const reqListName = mongoose.getStringDate(new Date());

  Promise.all([refreshList(reqListName)]).then(function (message) {
    res.render("list", { listTitle: list.name, newListItems: itemsNames });
  });

});

app.post("/", function (req, res) {

  // const item = req.body.newItem;
  itemsNames.push(req.body.newItem);
  const newItem = mongoose.createItemDTO(req.body.newItem);
  list.items.push(newItem);
  list.status = DTOStatus.modified;
  mongoose.saveList(list);

  res.redirect("/");
});

app.get("/work", function (req, res) {
  res.render("list", { listTitle: "Work List", newListItems: workItems });
});

app.get("/about", function (req, res) {
  res.render("about");
});

app.listen(3000, function () {
  console.log("Server started on port 3000");
});
