const moment = require("moment-timezone");

module.exports = {
  config: {
    name: "accept",
    aliases: ["acp"],
    version: "1.7",
    author: "MahMUD",
    countDown: 5,
    role: 2,
    category: "admin",
  },

  onReply: async function ({ message, Reply, event, api, commandName }) {
    const obfuscatedAuthor = String.fromCharCode(77, 97, 104, 77, 85, 68); 
     if (module.exports.config.author !== obfuscatedAuthor) {
     return api.sendMessage("You are not authorized to change the author name.", event.threadID, event.messageID);
     }
    
    const { author, listRequest } = Reply;
    if (author !== event.senderID) return;

    const args = event.body.trim().toLowerCase().split(" ");
    let action, doc_id;

    if (args[0] === "add") {
      action = "accepted";
      doc_id = "3147613905362928";
    } else if (args[0] === "del") {
      action = "deleted";
      doc_id = "4108254489275063";
    } else {
      return api.sendMessage("Invalid command! Use:\nadd <number|all> to accept\ndel <number|all> to delete", event.threadID, event.messageID);
    }

    let targetIDs = args[1] === "all" ? listRequest.map((_, index) => index + 1) : args.slice(1);
    const success = [], failed = [];

    for (const stt of targetIDs) {
      const user = listRequest[parseInt(stt) - 1];
      if (!user) {
        failed.push(`Can't find request #${stt}`);
        continue;
      }

      const form = {
        av: api.getCurrentUserID(),
        fb_api_caller_class: "RelayModern",
        fb_api_req_friendly_name: action === "accepted" ? "FriendingCometFriendRequestConfirmMutation" : "FriendingCometFriendRequestDeleteMutation",
        doc_id,
        variables: JSON.stringify({
          input: {
            source: "friends_tab",
            actor_id: api.getCurrentUserID(),
            friend_requester_id: user.node.id,
            client_mutation_id: Math.round(Math.random() * 19).toString()
          },
          scale: 3,
          refresh_num: 0
        })
      };

      try {
        const response = await api.httpPost("https://www.facebook.com/api/graphql/", form);
        if (JSON.parse(response).errors) failed.push(user.node.name);
        else success.push(user.node.name);
      } catch (e) {
        failed.push(user.node.name);
      }
    }

    let res = `Done ${action} ${success.length} requests:\n${success.join("\n")}`;
    if (failed.length > 0) res += `\nFailed ${failed.length}:\n${failed.join("\n")}`;
    api.sendMessage(res, event.threadID, event.messageID);
  },

  onStart: async function ({ event, api, commandName }) {
    const form = {
      av: api.getCurrentUserID(),
      fb_api_req_friendly_name: "FriendingCometFriendRequestsRootQueryRelayPreloader",
      fb_api_caller_class: "RelayModern",
      doc_id: "4499164963466303",
      variables: JSON.stringify({ input: { scale: 3 } })
    };

    try {
      const response = await api.httpPost("https://www.facebook.com/api/graphql/", form);
      const listRequest = JSON.parse(response).data.viewer.friending_possibilities.edges;
      if (!listRequest.length) return api.sendMessage("No pending friend requests.", event.threadID, event.messageID);

      let msg = `Total Requests: ${listRequest.length}\n`;
      listRequest.forEach((user, index) => {
        msg += `${index + 1}. ${user.node.name} (${user.node.id})\n`;
      });
      msg += "\nReply with 'add <number>' or 'del <number>'";

      api.sendMessage(msg, event.threadID, (e, info) => {
        global.GoatBot.onReply.set(info.messageID, { commandName, listRequest, author: event.senderID });
      }, event.messageID);
    } catch (e) {
      api.sendMessage("Failed to fetch requests.", event.threadID, event.messageID);
    }
  },
};
