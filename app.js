/*  ======== REQUIRE MODULES ======== */

const express = require("express");
const bodyParser = require("body-parser");
const { LogInStatus } = require("./mongooseInterface");
const { DTOStatus } = require(__dirname + "/mongooseInterface.js");
const mongoose = require(__dirname + "/mongooseInterface.js");


/* ======= CONFIG EXPRESS APP ======= */

const app = express();

app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));


/* AUXILIARY VARS AND METHODS */

class ListUI {
  constructor(name, items) {
    this.name = name;
    this.items = items;
  }
}

let actualListUI;
let actualUserDTO;


/* ====== APP EVENTS' HANDLERS ====== */

app.get("/login", function (req, res) {
  res.render("login", { message: '' });
})

app.post("/login", function (req, res) {
  mongoose.getUser(req.body.userName, req.body.password).then(function (userDTO) {
    if (userDTO.status === LogInStatus.userNotFound || userDTO.status === LogInStatus.error) {
      res.render("login", { message: 'something went wrong, try again' });
    } else {
      actualUserDTO = userDTO;
      console.log(userDTO);
    }
  });
});

app.get("/", function (req, res) {

  mongoose.getUser('test', 'test').then(function (userDTO) {
    mongoose.getAllUserLists(userDTO).then(function (listDTOs) {
      const lists = [];

      listDTOs.forEach(listDTO => {
        const items = [];

        listDTO.items.forEach(itemDTO => {
          items.push(itemDTO.name);
        });

        lists.push(new ListUI(listDTO.name, items));
      });

      res.render("home", { lists: lists });
    });
  })



})


app.get("/today", function (req, res) {

  const reqListName = mongoose.getStringDate(new Date());

  mongoose.getUser('test', 'test').then(function (userDTO) {
    mongoose.getListByName(reqListName, userDTO.id).then(function (foundList) {
      if (foundList === null) {
        foundList = mongoose.createListDTO(reqListName, userDTO.id, new Date(), []);
        mongoose.saveList(foundList);
      }

      let itemsNames = [];

      foundList.items.forEach(item => {
        itemsNames.push(item.name);
      });

      actualListUI = new ListUI(foundList.name, itemsNames);

      res.render("list", { list: actualListUI });

    });
  });

});


app.post("/today", function (req, res) {

  const newItem = mongoose.createItemDTO(req.body.newItem);
  actualListUI.items.push(newItem);
  actualListUI.status = DTOStatus.modified;
  mongoose.saveList(actualListUI);

  res.redirect("/");

});

app.get("/about", function (req, res) {
  res.render("about");
});

app.listen(3000, function () {
  console.log("Server started on port 3000");
});
