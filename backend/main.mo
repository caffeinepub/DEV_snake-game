import OrderedMap "mo:base/OrderedMap";
import Text "mo:base/Text";
import Iter "mo:base/Iter";

actor {
  transient let textMap = OrderedMap.Make<Text>(Text.compare);

  var highScores = textMap.empty<Nat>();

  public func submitScore(playerName : Text, score : Nat) : async () {
    highScores := textMap.put(highScores, playerName, score);
  };

  public query func getHighScores() : async [(Text, Nat)] {
    Iter.toArray(textMap.entries(highScores));
  };
};
