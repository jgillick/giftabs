
/**
  Handles the app's central storage
*/
(function(){
var store = function(){};
store.prototype = {
  gifs: [],
  history: [],
  favorites: [],
  settings: {},
  lastFeedUpdate: 0,
  randomChooseCount: 0,


  /**
    Load the storage into variables

    @param {String or Array} properties List of property names to update
    @returns Promise
  */
  load: function(properties, label){
    var dfd = new jQuery.Deferred();

    chrome.storage.local.get(properties, (function(items){
      this.gifs              = items.gifs || this.gifs;
      this.history           = items.history || this.history;
      this.favorites         = items.favorites || this.favorites;
      this.settings          = items.settings || this.settings;
      this.lastFeedUpdate    = items.lastFeedUpdate || this.lastFeedUpdate;
      this.randomChooseCount = items.randomChooseCount || this.randomChooseCount;

      // Default settings
      this.settings = _.defaults(this.settings, {
        theme: 'light_gray',
        giphy: true,
        reddit: true
      });

      dfd.resolve();
    }).bind(this));

    return dfd.promise();
  },

  /**
    Update the storage and return a promise

    @param {String} property The property name to save
    @returns Promise
  */
  save: function(property) {
    var store = {},
        dfd = new jQuery.Deferred();

    // Truncate to 500 gifs and 10 history
    if (this.gifs.length > 500) {
      this.gifs = this.gifs.slice(0, 500);
    }
    if (this.history.length > 20) {
      this.history = this.history.slice(0, 20);
    }
    this.history = _.compact(this.history);

    // Setup store
    store = {
      version:           chrome.app.getDetails().version,
      gifs:              this.gifs,
      history:           this.history,
      favorites:         this.favorites,
      settings:          this.settings,
      lastFeedUpdate:    this.lastFeedUpdate,
      randomChooseCount: this.randomChooseCount
    }
    // console.log('Save', store);

    // Save to chrome storage
    chrome.storage.local.set(store, function(){
      dfd.resolve();
    });

    return dfd.promise();
  },

  /**
    Add a new gif to the list

    @param {Object} gif The gif object ot add
  */
  addGif: function(gif) {
    this.gifs.unshift(gif);
  },

  /**
    Add the a gif to the favorites list

    @param {Object} gif The gif to add
    return Promise
  */
  addToFavorites: function(gif) {
    var fav = _.clone(gif);

    // Update latest favorites
    this.load('favorites').then((function(){
      var fav;

      // Remove duplicates and shift this on top of the array
      this.favorites = this.favorites.filter(function(f){ return f.id != fav.id; });
      this.favorites.unshift(fav);

      return this.save('favorites');
    }).bind(this));
  },

  /**
    Add a gif to the top of the history list

    @param {Object} gif The gif to add
    return Promise
  */
  addToHistory: function(gif) {
    var dfd = new jQuery.Deferred();

    // Load latest history
    this.load('history').then((function(){

      // Remove duplicate
      this.history = this.history.filter(function(h){ return h != gif.id; });

      // Add and save
      this.history.unshift(gif.id);
      this.save('history').then(function(){
        dfd.resolve();
      });
    }).bind(this));

    return dfd.promise();
  },


  /**
    Prune the image list of images that should
    be filtered out by the settings.

    i.e. if someone unchecked the giphy settings, we
    should prune all giphy images
  */
  pruneImageList: function() {

    // Filter history, then load a new list
    // (since loading a new list will wipe out everything except history images)
    this.history = this.history.map(function(id, index) {
      var gif = Gifs.forID(id);

      // Feed
      if (Store.settings[gif.feed] === false) {
        return null;
      }
      return id;
    });
    this.history = _.compact(this.history);

    return Gifs.loadNewGifs(true);
  }

}

window.Store = new store();
})();