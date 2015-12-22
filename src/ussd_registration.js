// This app handles registration

go.app = function() {
    var vumigo = require('vumigo_v02');
    var App = vumigo.App;
    var ChoiceState = vumigo.states.ChoiceState;
    var Choice = vumigo.states.Choice;
    var EndState = vumigo.states.EndState;
    var FreeText = vumigo.states.FreeText;


    var GoApp = App.extend(function(self) {
        App.call(self, 'state_start');
        var $ = self.$;
        var lang = 'eng_NG';
        var interrupt = true;

        self.add = function(name, creator) {
            self.states.add(name, function(name, opts) {
                if (!interrupt || !go.utils.should_restart(self.im))
                    return creator(name, opts);

                interrupt = false;
                opts = opts || {};
                opts.name = name;
                // Prevent previous content being passed to next state
                self.im.msg.content = null;
                return self.states.create('state_start', opts);
            });
        };

    // START

        self.states.add('state_start', function(name) {
            // Reset user answers when restarting the app
            self.im.user.answers = {};
            return self.states.create("state_r01_number");
        });


    // REGISTRATION

        self.add('state_r01_number', function(name) {
            var speech_option = '1';
            return new FreeText(name, {
                question: $('Welcome, Number'),
                helper_metadata: go.utils.make_voice_helper_data(
                    self.im, name, lang, speech_option),
                next: function(content) {
                    if (go.utils.check_valid_phone_number(content) === false) {
                        return 'state_r02_retry_number';
                    } else {
                        self.im.user.set_answer('mama_num', content);
                        return go.utils
                            // get or create mama contact
                            .get_or_create_contact(content, self.im)
                            .then(function(mama_id) {
                                self.im.user.set_answer('mama_id', mama_id);
                                return 'state_r03_receiver';
                            });
                    }
                }
            });
        });

        self.add('state_r02_retry_number', function(name) {
            var speech_option = '1';
            return new FreeText(name, {
                question: $('Retry number'),
                helper_metadata: go.utils.make_voice_helper_data(
                    self.im, name, lang, speech_option),
                next: function(content) {
                    if (go.utils.check_valid_phone_number(content) === false) {
                        return 'state_r02_retry_number';
                    } else {
                        self.im.user.set_answer('mama_num', content);
                        return go.utils
                            // get or create mama contact
                            .get_or_create_contact(content, self.im)
                            .then(function(mama_id) {
                                self.im.user.set_answer('mama_id', mama_id);
                                return 'state_r03_receiver';
                            });
                    }
                }
            });
        });

        self.add('state_r03_receiver', function(name) {
            var speech_option = '1';
            return new ChoiceState(name, {
                question: $('Choose receiver'),
                helper_metadata: go.utils.make_voice_helper_data(
                    self.im, name, lang, speech_option),
                choices: [
                    new Choice('mother', $('Mother')),
                    new Choice('other', $('Other'))
                ],
                next: 'state_r04_mom_state'
            });
        });

        self.add('state_r04_mom_state', function(name) {
            var speech_option = '1';
            return new ChoiceState(name, {
                question: $('Pregnant or baby'),
                helper_metadata: go.utils.make_voice_helper_data(
                    self.im, name, lang, speech_option),
                choices: [
                    new Choice('pregnant', $('Pregnant')),
                    new Choice('baby', $('Baby'))
                ],
                next: 'state_r05_birth_year'
            });
        });

        self.add('state_r05_birth_year', function(name) {
            // TODO #6 Don't show next year for pregnancy in Jan / Feb
            var speech_option;
            var year_choices = [
                new Choice('last_year', $('last_year')),
                new Choice('this_year', $('this_year')),
                new Choice('next_year', $('next_year'))
            ];
            if (self.im.user.answers.state_r04_mom_state === 'pregnant') {
                choices = year_choices.slice(1,3);
                speech_option = '1';
            } else {
                choices = year_choices.slice(0,2);
                speech_option = '2';
            }
            return new ChoiceState(name, {
                question: $('Birth year?'),
                helper_metadata: go.utils.make_voice_helper_data(
                    self.im, name, lang, speech_option),
                choices: choices,
                next: function(choice) {
                    return 'state_r06_birth_month';
                }
            });
        });

        self.add('state_r06_birth_month', function(name) {
            var speech_option;
            self.im.user.answers.state_r04_mom_state === 'pregnant'
                ? speech_option = '1'
                : speech_option = '2';
            // create choices eg. new Choice('1', '1') etc.
            var month_choices = [];
            for (i=1; i<=12; i++) {
                month_choices.push(new Choice(i.toString(), i.toString()));
            }
            return new ChoiceState(name, {
                question: $('Birth month? 1-12'),
                helper_metadata: go.utils.make_voice_helper_data(
                    self.im, name, lang, speech_option),
                choices: month_choices,
                next: 'state_r07_confirm_month'
            });
        });

        self.add('state_r07_confirm_month', function(name) {
            var routing = {
                'confirm': 'state_r08_birth_day',
                'retry': 'state_r06_birth_month'
            };
            var speech_option = self.im.user.answers.state_r06_birth_month;
            return new ChoiceState(name, {
                question: $('You entered x for Month. Correct?'),
                helper_metadata: go.utils.make_voice_helper_data(
                    self.im, name, lang, speech_option),
                choices: [
                    new Choice('confirm', $('confirm')),
                    new Choice('retry', $('retry'))
                ],
                next: function(choice) {
                    return routing[choice.value];
                }
            });
        });

        self.add('state_r08_birth_day', function(name) {
            var month = self.im.user.answers.state_r06_birth_month;
            var speech_option = go.utils.get_speech_option_birth_day(
                self.im, month);
            return new FreeText(name, {
                question: $('Birth day in {{ month }}?'
                    ).context({ month: month }),
                helper_metadata: go.utils.make_voice_helper_data(
                    self.im, name, lang, speech_option),
                next: function(content) {
                    var birth_date = go.utils.get_baby_dob(self.im, content);
                    if (birth_date === 'invalid date') {
                        return 'state_r14_retry_birth_day';
                    } else {
                        self.im.user.set_answer('birth_date', birth_date);
                        return 'state_r09_language';
                    }
                }
            });
        });

        self.add('state_r14_retry_birth_day', function(name) {
            var speech_option = '1';
            return new FreeText(name, {
                question: $('Retry birth day'),
                helper_metadata: go.utils.make_voice_helper_data(
                    self.im, name, lang, speech_option),
                next: function(content) {
                    var birth_date = go.utils.get_baby_dob(self.im, content);
                    if (birth_date === 'invalid date') {
                        return 'state_r14_retry_birth_day';
                    } else {
                        self.im.user.set_answer('birth_date', birth_date);
                        return 'state_r09_language';
                    }
                }
            });
        });

        self.add('state_r09_language', function(name) {
            var speech_option = '1';
            return new ChoiceState(name, {
                question: $('Language?'),
                helper_metadata: go.utils.make_voice_helper_data(
                    self.im, name, lang, speech_option),
                choices: [
                    new Choice('english', $('english')),
                    new Choice('hausa', $('hausa')),
                    new Choice('igbo', $('igbo')),
                ],
                next: 'state_r10_message_type'
            });
        });

        self.add('state_r10_message_type', function(name) {
            var speech_option = '1';
            var routing = {
                'sms': 'state_r13_enter',
                'voice': 'state_r11_voice_days'
            };
            return new ChoiceState(name, {
                question: $('Channel?'),
                helper_metadata: go.utils.make_voice_helper_data(
                    self.im, name, lang, speech_option),
                choices: [
                    new Choice('sms', $('sms')),
                    new Choice('voice', $('voice'))
                ],
                next: function(choice) {
                    return routing[choice.value];
                }
            });
        });

        self.add('state_r11_voice_days', function(name) {
            var speech_option = '1';
            return new ChoiceState(name, {
                question: $('Message days?'),
                helper_metadata: go.utils.make_voice_helper_data(
                    self.im, name, lang, speech_option),
                choices: [
                    new Choice('mon_wed', $('mon_wed')),
                    new Choice('tue_thu', $('tue_thu'))
                ],
                next: 'state_r12_voice_times'
            });
        });

        self.add('state_r12_voice_times', function(name) {
            var days = self.im.user.answers.state_r11_voice_days;
            var speech_option = go.utils.get_speech_option_days(days);
            return new ChoiceState(name, {
                question: $('Message time?'),
                helper_metadata: go.utils.make_voice_helper_data(
                    self.im, name, lang, speech_option),
                choices: [
                    new Choice('9_11', $('9_11')),
                    new Choice('2_5', $('2_5'))
                ],
                next: 'state_r13_enter'
            });
        });

        self.add('state_r13_enter', function(name) {
            return go.utils
                .save_contact_info_and_subscribe(self.im)
                .then(function() {
                    return go.utils
                        .vumi_send_text(self.im, self.im.user.answers.mama_num,
                            self.im.config.reg_complete_sms)
                        .then(function() {
                            return self.states.create('state_r13_end');
                        });
                });
        });

        self.add('state_r13_end', function(name) {
            var time = self.im.user.answers.state_r12_voice_times;
            var days = self.im.user.answers.state_r11_voice_days;
            var speech_option = go.utils.get_speech_option_days_time(days, time);
            var text;
            time === undefined
                ? text = $('Thank you!')
                : text = $('Thank you! Time: {{ time }}. Days: {{ days }}.'
                           ).context({ time: time, days: days });
            return new EndState(name, {
                text: text,
                helper_metadata: go.utils.make_voice_helper_data(
                    self.im, name, lang, speech_option),
                next: 'state_start'
            });
        });

    });

    return {
        GoApp: GoApp
    };
}();