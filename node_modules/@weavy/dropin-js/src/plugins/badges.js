import Weavy from '../weavy';

/**
 * Plugin for getting notification and conversation badges.
 * 
 * @mixin BadgesPlugin
 * @param {Weavy} weavy - The Weavy instance
 * @param {Object} options - Plugin options
 * @returns {Weavy.plugins.badges}
 * @property {BadgesPlugin#getBadges} .getBadges()
 * @typicalname weavy
 */
class BadgesPlugin {
  constructor(weavy, options) {

    const badgesPlugin = this;
    let polling = new Map();

    /**
     * Gets the number of unread conversations and notifications.
     *
     * @example
     * weavy.plugins.badges.getBadges().then(function (data) { 
     *     weavy.log("New notifications count", data.notifications);
     *     weavy.log("Unread conversations count", data.conversations);
     * });
     *
     * @returns {Promise}
     * @property {int} conversations - Number of unread conversations
     * @property {int} notifications - Number of unread notifications
     * @property {int} total - The total number of unread conversations and notifications.
     */
    this.getBadges = (app) => {
      if (app.type === "messenger") {
        return weavy.fetch("dropin/client/conversation-badge/").then(
          (conversationBadge) => conversationBadge.private + conversationBadge.rooms
        );
      }
      return Promise.reject();
    }

    this.get = (app) => {
      badgesPlugin.getBadges(app).then((count) => {
        app.triggerEvent("badge", { count: count })
      }).catch(() => { /* No worries */});
    }

    // Trigger initial badge event
    weavy.whenLoaded().then(() => {
      
      for (var i = 0; i < weavy.apps.length; i++) {
        let app = weavy.apps[i];
        if (app.options.badge) {

          // poll until app is loaded
          polling.set(app, window.setInterval(() => badgesPlugin.get(app), options.pollingTime));
          
          app.whenLoaded().then(() => {
            // cancel polling            
            clearInterval(polling.get(app));
            polling.delete(app);
            // get badge when the app is loaded and ready
            badgesPlugin.get(app);
          });

          // get badge when weavy is loaded
          badgesPlugin.get(app);          
        }
      }
    });


    weavy.on("message", { name: "badge" }, (e, message) => {
      if (message.app && message.app.options.badge) {

        /**
         * Triggered on an app when the badge count is updated.
         * 
         * @event BadgesPlugin#badge
         * @returns {Object}
         * @property {int} count - The ount of the badge
         * @property {WeavyApp} app - The app that fires the event
         */
        message.app.triggerEvent("badge", { count: message.count })
      }
    });

    weavy.on("destroy clear-user signed-out", function () {
      // cancel polling
      polling.forEach((poll) => window.clearInterval(poll));
      polling.clear();

      // TODO: clear badges
      //weavy.triggerEvent("message", { name: "badge", id: null, count: 0 });
    })
  }
}

/**
 * Default plugin options
 * 
 * @example
 * Weavy.plugins.badges.defaults = {
 *  pollingTime: 60 * 1000
 * };
 * 
 * @name defaults
 * @memberof BadgesPlugin
 * @type {Object}
 */
BadgesPlugin.defaults = {
  pollingTime: 60 * 1000
};

// Register and return plugin
//console.debug("Registering Weavy plugin: badges");
Weavy.plugins.badges = BadgesPlugin;

export default BadgesPlugin;
