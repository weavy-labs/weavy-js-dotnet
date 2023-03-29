# Weavy JS UI kit + .NET

A simple ASP.NET application with best-practices, examples and guides on how to integrate the Weavy drop-in UI. The application is structured like an intranet for the fictional ACME corporation and has basic features for user management including login, logout, editing user profiles and settings.

Some of the things showcased in the application are:

* Integration of the Weavy drop-in UI components (chat, feed, files, messenger).
* How to implement and configure a token factory for authenticating your users.
* Syncing user and profile data from your appliction to Weavy.
* Server-to-server api requests with API keys.
* User-to-server api requests with access tokens.
* How to apply custom styling, including toggling light/dark mode.
* How to handle webhook events and update the user interface in realtime when these events happen, e.g. display a notification, update the count of unread messages etc.
* Timezone configuration so that dates and times are displayed according to your user's preference.

## Prerequisites

* You need a Weavy environment up and running. See http://www.weavy.com/docs for more information.
* You need an API key for communication between your app and the Weavy environment (if you don't have an API key, you can generate one in your Weavy account). See http://www.weavy.com/docs for more information.

## Getting started

* Create an `appsettings.json` file in the project root folder with the following content:

  ```json
  {
    "Weavy": {
      "Server": "url to your weavy environment",
      "ApiKey": "your weavy environment api key"
    }
  }
  ```

* Populate the `Server` property with the url to your Weavy environment.
* Populate the `ApiKey` property with a valid API key from your Weavy environment.
* Open a terminal window and run `npm install && npm run build` to build css and js.
* Run `dotnet run` from the terminal or press `Ctrl+F5` from Visual Studio to run the application.
* Open your browser and navigate to https://localhost:7059. To login you can use any of the following credentials:
  
  - username: `admin`, `bugs`, `daffy`, `porky`, `tweety`, `wile`, or `meepmeep`
  - password: `acme`

## Database

This application uses a SQLite database, `acme.db`, to store application data such as users and their settings. The database is automatically created on startup, and deleting it will reset the database to it's initial state on next startup.

