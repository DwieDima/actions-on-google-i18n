const fs = require('fs');
const appRootDir = require('app-root-dir');
class I18n {
  _fileExists(file) {
    return (
      fs.existsSync(file) ||
      fs.existsSync(`${file}.js`) ||
      fs.existsSync(`${file}.json`)
    );
  }
  constructor() {
    this.projectDirectory = appRootDir.get();
  }
  configure(options = {}) {
    if (options.directory && !this._fileExists(options.directory)) {
      throw new Error(
        `[actions-on-google-i18n] directory "${
        options.directory
        }" does not exist.`
      );
    }
    if (options.defaultFile && !this._fileExists(options.defaultFile)) {
      throw new Error(
        `[actions-on-google-i18n] file "${options.defaultFile}" does not exist.`
      );
    }
    this._options = options;
    this.directory =
      options.directory || `${this.projectDirectory}/src/locales`;
    this.defaultFile =
      options.defaultFile || `${this.projectDirectory}/src/locales/index.json`;
    this.defaultLocale = options.defaultLocale || 'en-US';
    this.defaultExtension = options.defaultExtension;
    return this;
  }
  use(app) {
    if (!this._options) {
      this.configure();
    }
    const i18nFactory = (conv, type) => {
      const locales = this.initLocaleFile(conv);
      switch (type) {
        case 'raw':
          return (key, context = {}) => {
            let translation = locales[key];
            if (!translation) {
              // wring key provided
              throw new Error(`Error: "${key}" was not found in locales [${Object.keys(locales)}}]. This is the locales file: ${locales}`);
            }
            if (Array.isArray(translation)) {
              // if there are many utterances for a given key, pick a random one
              translation = translation[Math.floor((Math.random() * translation.length))]
            }
            if (translation) {
              if (typeof translation === "string") {
                // if the utterance value is a simple text, 
                // go ahead and apply the context 
                translation = this.applyContext(translation, context);
              }
              else if (typeof translation === "object") {
                // if the utterance value is a {text, speech} object
                if (translation.text && translation.speech) {
                  translation = {
                    text: this.applyContext(translation.text, context),
                    speech: this.applyContext(translation.speech, context),
                  }
                }
                else {
                  throw new Error("Error: only 'text' and 'speech' values are allowed.");
                }
              }
            }
            if (translation.text && translation.speech) {
              return translation.text;
            }
            return translation;
          };
          break;
        case 'all':
          return (key) => {
            let translation = locales[key];
            if (!translation) {
              // wring key provided
              throw new Error(`Error: "${key}" was not found in locales [${Object.keys(locales)}}]. This is the locales file: ${locales}`);
            }
            return translation;
          };
          break;
        default:
          return (key, context = {}) => {
            let translation = locales[key];
            if (!translation) {
              // wrong key provided
              throw new Error(`Error: "${key}" was not found in locales [${Object.keys(locales)}}]. This is the locales file: ${locales}`);
            }
            if (Array.isArray(translation)) {
              // if there are many utterances for a given key, pick a random one
              translation = translation[Math.floor((Math.random() * translation.length))]
            }
            if (translation) {
              if (typeof translation === "string") {
                // if the utterance value is a simple text, 
                // go ahead and apply the context 
                translation = this.applyContext(translation, context);
              }
              else if (typeof translation === "object") {
                // if the utterance value is a {text, speech} object
                if (translation.text && translation.speech) {
                  translation = {
                    text: this.applyContext(translation.text, context),
                    speech: this.applyContext(translation.speech, context),
                  }
                }
                else {
                  throw new Error("Error: only 'text' and 'speech' values are allowed.");
                }
              }
            }
            return translation;
          };
          break;
      }
    };
    // Register a middleware to set i18n function on each conv
    app.middleware(conv => {
      conv.__ = conv.i18n = i18nFactory(conv);
      conv.__all = conv.i18nAll = i18nFactory(conv, 'all');
      conv.__raw = conv.i18nRaw = i18nFactory(conv, 'raw');
    });
    app.__ = app.i18n = i18nFactory();
    app.__all = app.i18nAll = i18nFactory(null, 'all');
    app.__raw = app.i18nRaw = i18nFactory(null, 'raw');
  }
  initLocaleFile(conv) {
    let file = `${this.directory}/${this.getLocale(conv)}`;
    if (this.defaultExtension) {
      if (['js', 'json'].includes(this.defaultExtension)) {
        file = `${file}.${this.defaultExtension}`;
      } else {
        throw new Error(
          `[actions-on-google-i18n] extension "${
          this.defaultExtension
          }" is not allowed. Only "js" and "json" files are allowed.`
        );
      }
    }
    if (this._options.defaultFile && this._fileExists(this.defaultFile)) {
      file = this.defaultFile;
    }
    if (!this._fileExists(file)) {
      throw new Error(
        `[actions-on-google-i18n] file "${file}" does not exist.`
      );
    }
    return this.flattenObject(require(file));
  }
  applyContext(translation, context) {
    for (let ctxKey in context) {
      translation = translation.replace(
        '{' + ctxKey + '}',
        context[ctxKey]
      );
    }
    return translation;
  }
  flattenObject(ob) {
    var toReturn = {};
    for (var i in ob) {
      if (!ob.hasOwnProperty(i)) continue;
      if ((typeof ob[i]) == 'object' && ob[i] !== null && !Array.isArray(ob[i])) {
        var flatObject = this.flattenObject(ob[i]);
        for (var x in flatObject) {
          if (!flatObject.hasOwnProperty(x)) continue;
          toReturn[i + '.' + x] = flatObject[x];
        }
      } else {
        toReturn[i] = ob[i];
      }
    }
    return toReturn;
  }
  getLocale(conv) {
    let locale = conv && conv.user && conv.user.locale;
    if (!locale) {
      locale = this.defaultLocale;
    }
    if (!locale) {
      throw new Error(
        `[actions-on-google-i18n] Locale is not valid. Found "${locale}".`
      );
    }
    return locale.toLowerCase();
  }
}
module.exports = new I18n();
