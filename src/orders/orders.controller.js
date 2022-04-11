const path = require("path");
const orders = require(path.resolve("src/data/orders-data"));
const nextId = require("../utils/nextId");

//middleware functions
function bodyDataHas(propertyName) {
  return function (req, res, next) {
    const { data = {} } = req.body;
    if (data[propertyName] && data[propertyName] !== "") {
      return next();
    } else {
      next({
        status: 400,
        message: `Order must include a ${propertyName}`,
      });
    }
  };
}

function dishesPropertyIsValid(req, res, next) {
  const { data: { dishes } = {} } = req.body;
  if (Array.isArray(dishes) && dishes.length > 0) {
    return next();
  } else {
    next({
      status: 400,
      message: "Order must include at least one dish",
    });
  }
}

function quantityPropertyIsValid(req, res, next) {
  const { data: { dishes } = {} } = req.body;
  dishes.map((dish, index) => {
    if (
      !dish.quantity ||
      Number(dish.quantity) < 1 ||
      typeof dish.quantity !== "number"
    ) {
      return next({
        status: 400,
        message: `Dish ${index} must have a quantity that is an integer greater than 0`,
      });
    }
  });
  next();
}

function orderExists(req, res, next) {
  const { orderId } = req.params;
  const foundOrder = orders.find((order) => order.id === orderId);
  if (foundOrder) {
    res.locals.order = foundOrder;
    return next();
  } else {
    next({
      status: 404,
      message: `Order does not exist: ${orderId}`,
    });
  }
}

function idPropertyIsValid(req, res, next) {
  const { orderId } = req.params;
  const { data: { id } = {} } = req.body;
  if (!id || id === orderId) {
    return next();
  } else {
    next({
      status: 400,
      message: `Order id does not match route id. Order: ${id}, Route: ${orderId}`,
    });
  }
}

function statusPropertyIsValid(req, res, next) {
  const statusArray = ["pending", "preparing", "out-for-delivery"];
  const { data: { status } = {} } = req.body;
  if (statusArray.includes(status)) {
    return next();
  } else if (status === "delivered") {
    next({
      status: 400,
      message: "A delivered order cannot be changed",
    });
  } else {
    next({
      status: 400,
      message:
        "Order must have a status of pending, preparing, out-for-delivery, delivered",
    });
  }
}

function verifyDeleteStatus(req, res, next) {
  const status = res.locals.order.status;
  if (status === "pending") {
    return next();
  } else
    next({
      status: 400,
      message: "An order cannot be deleted unless it is pending",
    });
}

// handler functions
function list(req, res) {
  res.json({ data: orders });
}

function create(req, res) {
  const { data: { deliverTo, mobileNumber, dishes } = {} } = req.body;
  const newOrder = {
    id: nextId(),
    deliverTo,
    mobileNumber,
    dishes,
  };
  orders.push(newOrder);
  res.status(201).json({ data: newOrder });
}

function read(req, res) {
  res.json({ data: res.locals.order });
}

function update(req, res) {
  const order = res.locals.order;
  const { data: { deliverTo, mobileNumber, status, dishes } = {} } = req.body;
  order.deliverTo = deliverTo;
  order.mobileNumber = mobileNumber;
  order.status = status;
  order.dishes = dishes;
  res.json({ data: order });
}

function destroy(req, res) {
  const { orderId } = req.params;
  const index = orders.find((order) => order.id === orderId);
  orders.splice(index, 1);
  res.sendStatus(204);
}

module.exports = {
  list,
  create: [
    bodyDataHas("deliverTo"),
    bodyDataHas("mobileNumber"),
    bodyDataHas("dishes"),
    dishesPropertyIsValid,
    quantityPropertyIsValid,
    create,
  ],
  read: [orderExists, read],
  update: [
    orderExists,
    bodyDataHas("deliverTo"),
    bodyDataHas("mobileNumber"),
    bodyDataHas("dishes"),
    dishesPropertyIsValid,
    quantityPropertyIsValid,
    idPropertyIsValid,
    statusPropertyIsValid,
    update,
  ],
  delete: [orderExists, verifyDeleteStatus, destroy],
};
