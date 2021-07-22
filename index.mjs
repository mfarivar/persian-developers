import {join} from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import Loki from 'lokijs';
import {nanoid} from 'nanoid';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import moment from 'moment-timezone/builds/moment-timezone-with-data.js';

dotenv.config();

const dbDir = join(process.cwd(), 'dbs');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir);
}


const db = new Loki(join(dbDir, 'db.json'), {
  autoload: true,
  autoloadCallback: main,
  autosave: true,
  autosaveInterval: 1000,
});

/**
 * Main
 */
async function main() {
  try {
    // Init app and middlewares
    const app = express();
    app.use(helmet());
    app.use(cors());

    const Users = db.addCollection('users');

    // serve moment.js files
    app.get('/scripts/bin/moment.min.js', (req, res) => {
      res.sendFile(process.cwd() +
        '/node_modules/moment/min/moment.min.js');
    });

    app.get('/scripts/bin/moment-timezone.min.js', (req, res) => {
      res.sendFile(process.cwd() +
        '/node_modules/moment-timezone/builds/moment-timezone-with-data.js');
    });
    app.use(express.static('public'));

    // Routes
    app.get('/api/request/', (req, res) => {
      const code = 200;
      try {
        const user = {
          id: nanoid(process.env.ID_SIZE),
          totalPomodoros: 0,
          todayPomodoros: 0,
          lastPomodoro: 0,
          pomodoros: [],
        };
        Users.insert(user);
        res.status(code).json({
          code: code,
          message: 'OK',
          result: {
            id: user.id,
            today: user.todayPomodoros,
            total: user.totalPomodoros,
          },
        });
      } catch (error) {
        if (code ===200) code = 500;
        res.status(code).json({
          code: code,
          message: error.message,
        });
      }
    });

    app.get('/api/pomodoro/:id', (req, res) => {
      let code = 200;
      try {
        const id = req.params.id;
        if (
          !id.match(/[a-zA-Z0-9-_]+/) ||
          id.length !== parseInt(process.env.ID_SIZE)
        ) {
          code = 400;
          throw new Error('Invalid ID');
        }
        const user = Users.findOne({id});
        if (!user) {
          code = 404;
          throw new Error('User Not Found');
        }

        // Tehran Time
        const t = moment().tz('Asia/Tehran');
        const endOfDay = moment(user.lastPomodoro)
            .tz('Asia/Tehran').endOf('day');

        if (t.isAfter(endOfDay)) {
          user.todayPomodoros = 0;
        }

        res.status(code).json({
          code: code,
          message: 'OK',
          result: {
            today: user.todayPomodoros,
            total: user.totalPomodoros,
          },
        });
      } catch (error) {
        if (code === 200) code = 500;
        res.status(code).json({
          code: code,
          message: error.message,
        });
      }
    });

    app.get('/api/reward/:id', (req, res) => {
      let code = 200;
      try {
        const id = req.params.id;
        if (
          !id.match(/[a-zA-Z0-9-_]+/) ||
          id.length !== parseInt(process.env.ID_SIZE)
        ) {
          code = 400;
          throw new Error('Invalid ID');
        }
        const user = Users.findOne({id});
        if (!user) {
          code = 404;
          throw new Error('User Not Found');
        }

        // Tehran Time
        const t = moment();
        const m = moment(user.lastPomodoro).tz('Asia/Tehran');
        const endOfDay = m.clone().endOf('day');
        const endOfHour = m.clone().endOf('hour');
        // Update only once per hour
        if (t.isAfter(endOfHour)) {
          if (t.isAfter(endOfDay)) {
            user.todayPomodoros = 1;
          } else {
            user.todayPomodoros++;
          }
          user.totalPomodoros++;
          user.lastPomodoro = +new Date;
          user.pomodoros.push({
            time: t.unix(),
          });
          Users.update(user);
        }

        res.status(code).json({
          code: code,
          message: 'OK',
          result: {
            today: user.todayPomodoros,
            total: user.totalPomodoros,
          },
        });
      } catch (error) {
        if (code === 200) code = 500;
        res.status(code).json({
          code: code,
          message: error.message,
        });
      }
    });

    // Launch server
    const port = process.env.PORT;
    app.listen(port, () => {
      console.log(`Listening at http://localhost:${port}`);
    });
  } catch (error) {
    console.error(error);
  }
};
