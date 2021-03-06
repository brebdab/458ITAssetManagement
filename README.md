# IT Asset Management Application



This project is broken up into a backend and frontend. The backend contains the Django project which uses the Django Rest Framework to host a simple API. The frontend uses React and queries data from the API.


## Development workflow

Run the following commands to get started:

```json
source <env dir name>/bin/activate
pip install -r requirements.txt
npm i
npm run build   ## note you need to rerun this step everytime there are changes in the front-end code 
python manage.py runserver 
```

In another terminal, run: 
```bash
npm start #This is only configured to  localhost:3000 is whitelisted 
```

## Testing on Postman with auth
Run the server as above and navigate to http://127.0.0.1:8000/rest-auth/login/
Login (slack Ben or Julia if you don't know how)
It should reply with your auth token--copy that
In Postman, go to the request's Headers, and add this:
```
Authorization: Token <your token>
```
Make sure the check box next to that part of the header is checked
Voila!

## Corsheader issues for Local dev

There are certain domains that are whitelisted under CORS_ORIGIN_WHITELIST in `settings.py`. If you are running code locally from any address that is not included in this, you will have to add it to this section. 

## Migrations

Whenever any changes are made to the Django models, these changes are not automatically applied to the app's database. These changes must be applied via migrations.

In order to reflect model changes in a new migration, run: 
```json
python manage.py makemigrations
```

Once these migrations are created, apply them to the database with: 
```json
python manage.py migrate
```

You can also view all previous migrations with: 
```json
python manage.py showmigrations
```
