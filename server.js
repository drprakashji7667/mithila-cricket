const express = require("express");
const app = express();

const PORT = 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="hi">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Mithila Cricket</title>

      <style>
        body {
          margin: 0;
          font-family: Arial, sans-serif;
          background: #f4f6f8;
        }

        .header {
          background: #0b5ed7;
          color: white;
          padding: 25px 20px;
          text-align: center;
        }

        .header h1 {
          margin: 0;
          font-size: 28px;
        }

        .header p {
          margin: 8px 0 0;
        }

        .container {
          padding: 20px;
        }

        .card {
          background: white;
          padding: 20px;
          margin-bottom: 15px;
          border-radius: 15px;
          box-shadow: 0 3px 10px rgba(0,0,0,0.08);
        }

        .card h2 {
          margin-top: 0;
        }

        button {
          width: 100%;
          padding: 14px;
          margin-top: 10px;
          border: none;
          border-radius: 10px;
          background: #0b5ed7;
          color: white;
          font-size: 16px;
        }
      </style>
    </head>

    <body>

      <div class="header">
        <h1>🏏 Mithila Cricket</h1>
        <p>Har Gaon Se Ek Champion</p>
      </div>

      <div class="container">

        <div class="card">
          <h2>🏏 Teams</h2>
          <p>Apni cricket team register karein.</p>
          <button>Teams Dekhein</button>
        </div>

        <div class="card">
          <h2>👤 Players</h2>
          <p>Players aur unke performance dekhein.</p>
          <button>Players Dekhein</button>
        </div>

        <div class="card">
          <h2>🔎 Find a Match</h2>
          <p>Apni team ke liye nearby match dhundhein.</p>
          <button>Match Dhundhein</button>
        </div>

        <div class="card">
          <h2>🏆 Tournaments</h2>
          <p>Upcoming aur ongoing tournaments.</p>
          <button>Tournaments</button>
        </div>

      </div>

    </body>
    </html>
  `);
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Mithila Cricket running on port ${PORT}`);
});
