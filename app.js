/*  ======== REQUIRE MODULES ======== */

const express = require("express");
const bodyParser = require("body-parser");
const { LogInStatus } = require("./mongooseInterface");
const { DTOStatus } = require(__dirname + "/mongooseInterface.js");
const mongoose = require(__dirname + "/mongooseInterface.js");
const lodash = require('lodash');
const { kebabCase } = require("lodash");


/* ======= CONFIG EXPRESS APP ======= */

const app = express();

app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname + '/public'));


/* AUXILIARY VARS AND METHODS */

class ListUI {
  constructor(name, items, route) {
    this.name = name;
    this.items = items;
    this.route = route;
  }
}

let actualListDTO;
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
      res.redirect("/");
    }
  });
});

app.get("/", function (req, res) {

  if (actualUserDTO === undefined) {
    res.redirect("/login");

  } else if (actualUserDTO.status !== LogInStatus.loggedin) {
    res.redirect("/login");

  } else {

    mongoose.getAllUserLists(actualUserDTO).then(function (listDTOs) {
      const lists = [];

      listDTOs.forEach(listDTO => {
        const items = [];

        listDTO.items.forEach(itemDTO => {
          items.push(itemDTO.name);
        });

        lists.push(new ListUI(listDTO.name, items, lodash.kebabCase(listDTO.name)));
      });

      res.render("home", { lists: lists });
    });
  }
})


app.get("/list", function (req, res) {

  if (actualUserDTO === undefined) {
    res.redirect("/login");

  } else if (actualUserDTO.status !== LogInStatus.loggedin) {
    res.redirect("/login");

  } else {
    
    const reqListName = lodash.lowerCase(req.query.title);

    mongoose.getListByName(reqListName, actualUserDTO.id).then(function (foundList) {
      if (foundList === null) {
        foundList = mongoose.createListDTO(reqListName, actualUserDTO.id, new Date(), []);
        mongoose.saveList(foundList);
      }

      let itemsNames = [];

      actualListDTO = foundList;

      foundList.items.forEach(item => {
        itemsNames.push(item.name);
      });

      const listUI = new ListUI(foundList.name, itemsNames, lodash.kebabCase(foundList.name));

      res.render("list", { list: listUI });

    });
  }

});


app.post("/list", function (req, res) {

  const newItem = mongoose.createItemDTO(req.body.newItem);
  actualListDTO.items.push(newItem);
  actualListDTO.status = DTOStatus.modified;
  mongoose.saveList(actualListDTO);

  res.redirect("/list?title=" + req.query.title);

});

app.get("/about", function (req, res) {
  res.render("about");
});

app.listen(3000, function () {
  console.log("Server started on port 3000");
});
