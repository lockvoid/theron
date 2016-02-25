import * as bcrypt from 'bcrypt';

import { ModelOptions } from 'bookshelf';
import { Database } from '../database';
import { AppRecord } from './app';

export class UserRecord extends Database.Model<any> {
  static async auth(email: string = '', password: string = ''): Promise<any> {
    let user = await (new UserRecord({ email })).fetch()

    return new Promise((resolve, reject) => {
      if (user) {
        bcrypt.compare(password, user.get('password'), (err, res) => {
          if (err) {
            reject(err);
          }

          if (res) {
            resolve(user);
          } else {
            resolve(null);
          }
        });
      } else {
        resolve(null);
      }
    });
  }

  constructor(attributes?: any, options?: ModelOptions) {
    super(attributes, options);
    this.on('creating', this.encryptPassword, this);
  }

  get tableName() {
    return 'users';
  }

  encryptPassword(model, attrs, options): Promise<any> {
    return new Promise((resolve, reject) => {
      bcrypt.hash(model.attributes.password, 10, (err, hash) => {
        if (err) {
          return reject(err);
        }

        model.set('password', hash);
        resolve(hash);
      });
    });
  }

  isValidPassword(sd) {
    console.log('sd');
  }

  apps() {
    return this.hasMany(AppRecord);
  }
}

////new UserRecord({email: 'kochnev.d@gmail.com', password: 'qazwsxedc'})
//.save()
