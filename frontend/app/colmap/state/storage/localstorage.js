"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var core_1 = require('@angular/core');
/* Normally would be something like "T implements Serializable",
   but since every JS Object is -- in this simple case, anyways -- serializable,
   i've left that part out
   TODO implement runtime checking, expiration checking, etc.
   TODO implement storage capabilities priority checking
*/
var LocalStorage = (function () {
    function LocalStorage() {
        if (typeof (Storage) === "undefined") {
            throw "LocalStorage unsupported";
        }
    }
    LocalStorage.prototype.load = function () {
        return JSON.parse(window.localStorage.getItem("preferences"));
    };
    LocalStorage.prototype.save = function (anything) {
        window.localStorage.setItem("preferences", JSON.stringify(anything));
    };
    LocalStorage = __decorate([
        core_1.Injectable(), 
        __metadata('design:paramtypes', [])
    ], LocalStorage);
    return LocalStorage;
}());
exports.LocalStorage = LocalStorage;
//# sourceMappingURL=localstorage.js.map