/*  ======== REQUIRE MODULES ======== */

const express = require("express");
const bodyParser = require("body-parser");
const { DTOStatus } = require(__dirname + "/mongooseInterface.js");
const mongoose = require(__dirname + "/mongooseInterface.js");


/* ======= CONFIG EXPRESS APP ======= */

const app = express();

app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));


/* AUXILIARY VARS AND METHODS */

class ListUI {
  constructor(name, items){
    this.name = name;
    this.items = items;
  }
}

let actualList;


/* ====== APP EVENTS' HANDLERS ====== */

app.get("/", function (req, res) {
  res.render("home");
})

app.get("/today", function (req, res) {

  const reqListName = mongoose.getStringDate(new Date());

  mongoose.getListByName(reqListName).then(function (foundList) {
    if (foundList === undefined){
      foundList = mongoose.createListDTO(reqListName, new Date(), 'daily', []);
      mongoose.saveList(foundList);
    }

    let itemsNames = [];

    foundList.items.forEach(item => {
      itemsNames.push(item.name);
    });

    actualList = new ListUI(foundList.name, itemsNames);

    res.render("list", { list: actualList });

  });


});

app.post("/today", function (req, res) {

  const newItem = mongoose.createItemDTO(req.body.newItem);
  actualList.items.push(newItem);
  actualList.status = DTOStatus.modified;
  mongoose.saveList(actualList);

  res.redirect("/");

});

app.get("/about", function (req, res) {
  res.render("about");
});

app.listen(3000, function () {
  console.log("Server started on port 3000");
});
