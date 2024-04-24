const express = require("express");
const cors = require("cors");
const LimitingMiddleware = require("limiting-middleware");
const {
  randomJoke,
  randomTen,
  randomSelect,
  jokeByType,
  jokeById,
  paginateJokes,
  removeJoke,
} = require("./handler");

function isNumber(value) {
  try {
    return !isNaN(parseInt(value));
  } catch (err) {
    return false;
  }
}

const app = express();

app.use(new LimitingMiddleware().limitByIp());
app.use(express.json());
app.use(cors());

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  next();
});

app.get("/", (req, res) => {
  res.send("Try /random_joke, /random_ten, /jokes/random, or /jokes/ten");
});

app.get("/ping", (req, res) => {
  res.send("pong");
});

app.get("/random_joke", (req, res) => {
  res.json(randomJoke());
});

app.get("/random_ten", (req, res) => {
  res.json(randomTen());
});

app.get("/jokes/random", (req, res) => {
  res.json(randomJoke());
});

// TODO: Needs fixing
app.get("/jokes/random(/*)?", (req, res) => {
  let num;

  try {
    num = parseInt(req.path.substring(14, req.path.length));
  } catch (err) {
    res.send("The passed path is not a number.");
  } finally {
    const count = Object.keys(jokes).length;

    if (num > Object.keys(jokes).length) {
      res.send(`The passed path exceeds the number of jokes (${count}).`);
    } else {
      res.json(randomSelect(num));
    }
  }
});

app.get("/jokes/ten", (req, res) => {
  res.json(randomTen());
});

app.get("/jokes/:type/random", (req, res) => {
  res.json(jokeByType(req.params.type, 1));
});

app.get("/jokes/:type/ten", (req, res) => {
  res.json(jokeByType(req.params.type, 10));
});

app.get("/jokes/paginate/", (req, res) => {
  const { pageSize, pageNumber, sortKey = null, sortOrder } = req.query;
  const validSortKeys = ["type", "setup", "punchline", "id"];
  const validSortOrders = ["asc", "desc"];
  try {
    if (!isNumber(pageSize)) {
      res.send("The pageSize is not a number.");
    } else if (!isNumber(pageNumber)) {
      res.send("The pageNumber is not a number.");
    } else if (sortKey !== null && !validSortKeys.includes(sortKey)) {
      res.send(`The sortKey valids are ${validSortKeys.join(",")}.`);
    } else if ((sortKey !== null) & !validSortOrders.includes(sortOrder)) {
      res.send(`The sortOrder valids are ${validSortOrders.join(",")}.`);
    } else {
      res.json(paginateJokes(pageSize, pageNumber, sortKey, sortOrder));
    }
  } catch (err) {
    res.send(`Error during pagination. ${err}`);
  }
});

app.get("/jokes/:id", (req, res, next) => {
  try {
    const { id } = req.params;
    const joke = jokeById(+id);
    if (!joke) return next({ statusCode: 404, message: "joke not found" });
    return res.json(joke);
  } catch (e) {
    return next(e);
  }
});

app.delete("/jokes/:id/delete", (req, res, next) => {
  try {
    const { id } = req.params;
    const wasJokeRemoved = removeJoke(+id);
    if (!wasJokeRemoved) {
      return next({ statusCode: 404, message: "joke not found" });
    }
    return res.status(200).send("Joke deleted!");
  } catch (e) {
    return next(e);
  }
});

app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;

  res.status(statusCode).json({
    type: "error",
    message: err.message,
  });
});

const PORT = process.env.PORT || 3005;
app.listen(PORT, () => console.log(`listening on ${PORT}`));
