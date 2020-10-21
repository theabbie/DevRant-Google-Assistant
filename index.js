var express = require('express');
var axios = require('axios');
var jwt = require("jsonwebtoken");
var rs = require("rantscript");
var app = express();
app.use(express.json());

app.post("/*", async function (req, res) {
  var q = req.body.queryResult.queryText || req.body.originalDetectIntentRequest.payload.inputs[0].rawInputs[0].query;
  try {
    if (req.body.originalDetectIntentRequest.payload.inputs[0].intent == "actions.intent.MAIN") {
      var rants = (await rs.rants('sort', 30)).rants.map(r => ["r" + r.id, r.text, "https://avatars.devrant.com/" + r["user_avatar"].i])

      res.json(create("Welcome To DevRant Bot", false, ["exit"], "reset", ["Rants", ...rants]))
    }
    else if (req.body.originalDetectIntentRequest.payload.inputs[0].intent == "actions.intent.OPTION") {
      var rant = await rs.rant(+q.substring(1));
      var comments = rant.comments.map(c => [c["user_username"], c.body, "https://avatars.devrant.com/" + c["user_avatar"].i]).slice(0, 30);
      res.json(create(rant.rant.text, false, ["exit"], rant.rant.id, ["Comments", ...comments], ["Rant", "https://devrant.com/rants/" + q.substring(1)]));
      //res.json(create("Go to Rant",["","","","","Open","https://devrant.com/rants/"+q.substring(1)],["exit"]));

    }
    else {
      var rant = await rs.rant(+q.substring(1));
      var comments = rant.comments.map(c => [c["user_username"], c.body, "https://avatars.devrant.com/" + c["user_avatar"].i]).slice(0, 30);
      res.json(create(rant.rant.text, false, ["exit"], rant.rant.id, ["Comments", ...comments], ["Rant", "https://devrant.com/rants/" + q.substring(1)]));
      //res.json(create('Could not process "'+q+'"',false,["exit"]));
    }
  }
  catch (e) {
    res.json(create("Go To DevRant For More", false, ["exit"], "", false, ["DevRant", "https://devrant.com"]));
  }
})

app.listen(process.env.PORT);

function create(msg, card, sugg, data, list, link) {
  var result = {
    "fulfillmentText": msg,
    "payload": {
      "google": {
        "expectUserResponse": true,
        "richResponse": {
          "items": [{
            "simpleResponse": {
              "textToSpeech": msg
            }
          }]
        },
        "userStorage": data
      }
    }
  };
  if (card) {
    result.fulfillmentMessages = [{
      "card": {
        "title": card[0],
        "subtitle": card[2],
        "imageUri": card[3],
        "buttons": [{
          "text": card[4],
          "postback": card[5]
        }]
      }
    }];
    result.payload.google.richResponse.items.push({
      "basicCard": {
        "title": card[0],
        "subtitle": card[1],
        "formattedText": card[2],
        "image": {
          "url": card[3],
          "accessibilityText": card[0]
        },
        "buttons": [{
          "title": card[4],
          "openUrlAction": {
            "url": card[5]
          }
        }],
        "imageDisplayOptions": "CROPPED"
      }
    });
  }
  if (sugg) {
    result.payload.google.richResponse.suggestions = [];
    sugg.forEach(function (x) {
      result.payload.google.richResponse.suggestions.push({
        "title": x
      })
    })
    if (link) {
      result.payload.google.richResponse["linkOutSuggestion"] = {
        "destinationName": link[0],
        "url": link[1]
      }
    }
  }
  if (list) {
    var title = list[0];
    list.shift();
    result.payload.google.systemIntent = {
      "intent": "actions.intent.OPTION",
      "data": {
        "@type": "type.googleapis.com/google.actions.v2.OptionValueSpec",
        "listSelect": {
          "title": title,
          "items": list.map(function (x) {
            return {
              "optionInfo": {
                "key": Array.isArray(x) ? x[0] : x,
                "synonyms": Array.isArray(x) ? [x[0]] : [x]
              },
              "description": Array.isArray(x) ? x[1] : x,
              "image": {
                "url": Array.isArray(x) ? x[2] : "https://storage.googleapis.com/actionsresources/logo_assistant_2x_64dp.png",
                "accessibilityText": Array.isArray(x) ? x[0] : x
              },
              "title": Array.isArray(x) ? x[0] : x
            }
          })
        }
      }
    };
  }
  return result;
}
