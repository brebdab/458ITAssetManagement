import "@blueprintjs/core/lib/css/blueprint.css";
import "@blueprintjs/icons/lib/css/blueprint-icons.css";
import "@blueprintjs/datetime/lib/css/blueprint-datetime.css";
import "@blueprintjs/select/lib/css/blueprint-select.css";
import "normalize.css/normalize.css";
import "normalize.css";
import React from "react";
import ReactDOM from "react-dom";
import "./index.scss";
import * as serviceWorker from "./serviceWorker";
import App from "./App";
import { createStore, compose, applyMiddleware } from "redux";
import reducer from "./store/reducers/state";
import thunk from "redux-thunk";
import { Provider } from "react-redux";

const composeEnhances =
  (window as any).__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ || compose || compose;

const store = createStore(reducer, composeEnhances(applyMiddleware(thunk)));

const app = (
  <Provider store={store}>
    <App />
  </Provider>
);

ReactDOM.render(app, document.getElementById("root"));

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.unregister();
