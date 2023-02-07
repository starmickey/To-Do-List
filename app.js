/*  ======== REQUIRE MODULES ======== */

const express = require("express");
const bodyParser = require("body-parser");
const { UserStatus, DTOStatus } = require("./mongooseInterface");
const mongoose = require(__dirname + "/mongooseInterface.js");
const lodash = require("lodash");



/* ======= CONFIG EXPRESS APP ======= */

const app = express();

app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname + '/public'));


/* AUXILIARY VARS AND METHODS */

class ListUI {
  constructor(id, name, items, route) {
    this.id = id;
    this.name = name;
    this.items = items;
  }
}

class ItemUI {
  constructor(id, name) {
    this.id = id;
    this.name = name;
  }
}

let actualUserDTO;
let actualListDTO;


/* ====== APP EVENTS' HANDLERS ====== */

app.get("/index", function (req, res) {
  let isLoggedIn = false;

  if (actualUserDTO !== undefined) {
    if (actualUserDTO.status === UserStatus.loggedin) {
      isLoggedIn = true;
    }
  }

  res.render("index", { isLoggedIn: isLoggedIn });
});

app.get("/login", function (req, res) {
  res.render("login", { message: '' });
})

app.post("/login", function (req, res) {
  mongoose.getUser(req.body.userName, req.body.password).then(function (userDTO) {
    if (userDTO.status === UserStatus.userNotFound || userDTO.status === UserStatus.error) {
      res.render("login", { message: 'something went wrong, try again' });
    } else {
      actualUserDTO = userDTO;
      res.redirect("/");
    }
  });
});

app.get("/signup", function (req, res) {
  res.render("signup", { message: '' });
});

app.post("/signup", function (req, res) {

  mongoose.createUser(req.body.userName, req.body.password).then(function (userDTO) {

    if (userDTO.status === UserStatus.signingUpExistingUser) {
      res.render("signup", { message: 'That User Name already exists.' });

    } else if (userDTO.status === UserStatus.loggedin) {
      actualUserDTO = userDTO;
      res.redirect("/");

    } else {
      res.render("signup", { message: 'Something went wrong. Please, try again.' });
    }
  })


})

app.get("/", function (req, res) {

  if (actualUserDTO === undefined) {
    res.redirect("/login");

  } else if (actualUserDTO.status !== UserStatus.loggedin) {
    res.redirect("/login");

  } else {

    mongoose.getAllUserLists(actualUserDTO).then(function (listDTOs) {
      const listUIs = [];

      listDTOs.forEach(listDTO => {
        const itemUIs = [];

        listDTO.items.forEach(itemDTO => {
          itemUIs.push(new ItemUI(itemDTO.id, itemDTO.name));
        });

        listUIs.push(new ListUI(listDTO.id, listDTO.name, itemUIs, lodash.kebabCase(listDTO.name)));
      });

      res.render("home", { lists: listUIs });
    });
  }
})


app.get("/list", function (req, res) {

  if (actualUserDTO === undefined) {
    res.redirect("/login");

  } else if (actualUserDTO.status !== UserStatus.loggedin) {
    res.redirect("/login");

  } else if (req.query.q === "newList") {
    actualListDTO = mongoose.createListDTO("new list", actualUserDTO.id, new Date(), []);
    mongoose.saveList(actualListDTO).then(function (listDTO) {
      actualListDTO = listDTO;
      res.render("list", { list: actualListDTO });
    });

  } else {

    mongoose.getListById(req.query.id).then(function (foundList) {
      if (foundList === null) {
        res.render("listnotfound");
      } else {

        let itemUIs = [];

        actualListDTO = foundList;

        foundList.items.forEach(item => {
          itemUIs.push(new ItemUI(item.id, item.name));
        });

        const listUI = new ListUI(foundList.id, foundList.name, itemUIs);

        res.render("list", { list: listUI });
      }

    });
  }

});


app.post("/list", function (req, res) {

  if (req.query.action === 'removeList') {
    mongoose.getListById(req.query.id).then(function (foundList) {
      foundList.status = DTOStatus.removed;
      mongoose.saveList(foundList);
    });

    res.redirect("/");

  } else {

    if (req.query.action === 'changeTitle') {
      actualListDTO.name = req.body.listTitle;
      actualListDTO.status = DTOStatus.modified;

    } else if (req.query.action === 'addItem') {
      const newItemDTO = mongoose.createItemDTO(req.body.itemName);
      actualListDTO = mongoose.addItemDTOToListDTO(actualListDTO, newItemDTO);

    } else if (req.query.action === 'removeItem') {
      const itemId = req.body.itemId;
      const itemDTO = actualListDTO.items.find(({ id }) => lodash.kebabCase(itemId) === lodash.kebabCase(id));
      actualListDTO = mongoose.removeItemDTOFromListDTO(actualListDTO, itemDTO);

    }

    mongoose.saveList(actualListDTO).then(function (listDTO) {
      actualListDTO = listDTO;
    });

    res.redirect("/list?id=" + req.query.id);
  }
});

app.get("/about", function (req, res) {
  let isLoggedIn = false;

  if (actualUserDTO !== undefined) {
    if (actualUserDTO.status === UserStatus.loggedin) {
      isLoggedIn = true;
    }
  }

  res.render("about", { isLoggedIn: isLoggedIn });
});


app.get("/signout", function (req, res) {
  actualUserDTO = undefined;
  res.redirect("/login");
});

app.listen(3000, function () {
  console.log("Server started on port 3000");
});
