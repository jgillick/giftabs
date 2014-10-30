/**
  Manages loading GIFs from various external
  feeds.
*/
window.Gifs = {

  /**
    All the gifs
  */
  all: function(){
    return Store.gifs;
  },

  /**
    Return a gif from the gifs pool by ID
  */
  forID: function(id) {
    if (Store.gifs.length == 0) {
      return null;
    }

    var found = _.find(Store.gifs, function(gif){
      return gif.id == id;
    });

    return found;
  },

  /**
    Return a random gif
  */
  random: function(){
    var i = Math.round(Math.random() * Store.gifs.length),
        gif = Store.gifs[i];

    if (_.compact(gif).length == 0) {
      throw "No gifs are loaded yet";
    }

    // Error
    if (!gif) {
      console.error('No gif at index', i);
      return this.random();
    }

    return gif;
  },

  /**
    Load gifs from Giphy and Reddit and returns a
    promise that will resolve as soon as the first source is done

    @param {boolean} forceUpdate Force the gif update
    @returns Promise
  */
  loadNewGifs: function(forceUpdate) {
    var dfd = new jQuery.Deferred(),
        now = Date.now(),
        gifLen = Store.gifs.length;

    // Don't load new gifs unless it's been 12 hours
    // or we've gone through at least 1/4 of the existing pool
    if (forceUpdate !== true
        && gifLen > 0
        && Store.randomChooseCount < (gifLen / 4)
        && now - Store.lastFeedUpdate < (60 * 60 * 12 * 1000)) {
      dfd.resolve();
      return dfd.promise();
    }

    lastFeedUpdate = now;
    randomChooseCount = 0;

    // Clear all gifs, except what is in history
    Store.gifs = Store.gifs.filter(function(gif) {
      return Store.history.indexOf(gif.id) > -1;
    });

    // Reddit
    if (Store.settings.reddit !== false) {
      $.get('http://www.reddit.com/r/gifs/.json?limit=100')
      .then((function(xhr){

        xhr.data.children.forEach(function(gif){
          gif = gif.data;

          var type  = gif.url.match(/\.([^\.]*)$/)[1],
              id    = "r"+ gif.id;

          // Skip
          if (gif.over_18 || gif.thumbnail == 'nsfw' || type != 'gif') {
            return;
          }

          // Update gif storage
          Store.addGif({
            id: id,
            url: gif.url,
            thumb: gif.thumbnail,
            sources: ["http://reddit.com/"+ gif.permalink],
            feed: 'reddit',
            title: gif.title
          });
        });

        // Save gifs to storage
        Store.save('gifs').then(function(){
          dfd.resolve();
        });
      }).bind(this));
    }

    // Giphy
    if (Store.settings.giphy !== false) {
      $.get('http://api.giphy.com/v1/gifs/trending?api_key=11zvNWrJ4cOCJi&limit=100')
      .then((function(xhr){

        xhr.data.forEach(function(gif){
          var id = "g"+ gif.id,
              sources = [gif.url];

          // Skip NSFW
          if (gif.rating.match(/r|x/i)) {
            return;
          }

          // Add external source
          if (gif.source != '') {
            sources.push(gif.source);
          }

          // Setup gif storage
          Store.addGif({
            id: id,
            url: gif.images.original.url,
            thumb: gif.images.fixed_height_still.url,
            sources: sources,
            feed: 'giphy',
            title: gif.title
          });
        });

        // Save gifs to storage
        Store.save('gifs').then(function(){
          dfd.resolve();
        });
      }).bind(this));
    }

    return dfd.promise();
  }

}
