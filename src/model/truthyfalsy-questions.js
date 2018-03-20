'use strict';

const mongoose = require('mongoose');
const TruthyFalsy = require('./truthyfalsy');

const TFQuestion = mongoose.Schema({
  question: {type: String, required: true},
  answer: {type: String, required: true},
  gameId: {type: mongoose.Schema.Types.ObjectId, ref: 'truthyFalsy', required: true},
});

TFQuestion.pre('save', function(next) {
  TruthyFalsy.findById(this.gameId)
    .then(game => {
      game.questions = [...new Set(game.questions).add(this._id)];
      game.save();
    })
    .then(next)
    .catch(() => next(new Error('Validation Error, failed to save question')));
});

TFQuestion.post('remove', function(doc, next) {
  TruthyFalsy.findById(doc.gameId)
    .then(game => {
      game.questions = game.questions.filter(v => v.toString() !== doc._id.toString());
      game.save();
    })
    .then(next)
    .catch(next);
});

module.exports = mongoose.model('tfquestion', TFQuestion);
