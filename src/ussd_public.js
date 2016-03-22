go.app = function() {
    var vumigo = require('vumigo_v02');
    var Q = require('q');
    var App = vumigo.App;
    var Choice = vumigo.states.Choice;
    var ChoiceState = vumigo.states.ChoiceState;
    var EndState = vumigo.states.EndState;
    var FreeText = vumigo.states.FreeText;


    var GoApp = App.extend(function(self) {
        App.call(self, 'state_start');
        var $ = self.$;
        var interrupt = true;

        self.init = function() {};


    // TEXT CONTENT

        var questions = {
            "state_timed_out":
                "You have an incomplete registration. Would you like to continue with this registration?",
            "state_msisdn_permission":  //st-B
                "Welcome to Hello Mama. Do you have permission to manage the number [MSISDN]?",
            "state_msisdn_no_permission":  // unnamed state on flow diagram
                "We're sorry, you do not have permission to update the preferences for this subscriber.",
            "state_language":   // st-D
                "Welcome to Hello Mama. Please choose your language",
            "state_registered_msisdn":  // st-C
                "Please enter the number which is registered to receive messages. For example, 0803304899",
            "state_main_menu":  // st-A
                "Select:",
            "state_main_menu_household": // st-A1
                "Select:",
            "state_msisdn_not_recognised":  // st-F
                "We do not recognise this number. Please dial from the registered number or sign up with your local Community Health Extension worker.",
            "state_already_registered_baby":
                "You are already registered for baby messages.",
            "state_new_registration_baby":
                "Thank you. You will now receive messages about caring for baby",
            "state_change_menu_sms":
                "Please select what you would like to do:",
            "state_voice_days":
                "We will call twice a week. On what days would the person like to receive messages?",
            "state_voice_times":
                "Thank you. At what time would they like to receive these calls?",
            "state_end_voice_confirm":
                "Thank you. You will now start receiving voice calls between [time] on [days].",
            "state_change_menu_voice":
                "Please select what you would like to do:",
            "state_end_sms_confirm":
                "Thank you. You will now receive text messages.",
            "state_new_msisdn":
                "Please enter the new mobile number you would like to receive weekly messages on. For example, 0803304899",
            "state_number_in_use":
                "Sorry, this number is already registered. They must opt-out before they can register again.",
            "state_msg_receiver":
                "Who will receive these messages?",
            "state_end_number_change":
                "Thank you. The number which receives messages has been updated.",
            "state_msg_language":
                "What language would this person like to receive these messages in?",
            "state_msg_language_confirm":
                "Thank you. You language preference has been updated and you will start to receive messages in this language.",
            "state_optout_reason":
                "Please tell us why you no longer want to receive messages so we can help you further.",
            "state_loss_subscription":
                "We are sorry for your loss. Would you like to receive a small set of free messages from Hello Mama that could help you in this difficult time?",
            "state_end_loss_subscription_confirm":
                "Thank you. You will now receive messages to support you during this difficult time.",
            "state_optout_receiver":
                "Who would you like to stop receiving messages?",
            "state_end_optout":
                "Thank you. You will no longer receive messages",
            "state_end_loss":
                "We are sorry for your loss. You will no longer receive messages. Should you need support during this difficult time, please contact your local CHEW",
            "state_end_exit":
                "Thank you for using the Hello Mama service"
        };

        var errors = {
            "state_registered_msisdn":
                "Mobile number not registered."
        };

        get_error_text = function(name) {
            return errors[name] || "Sorry not a valid input. " + questions[name];
        };


    // TIMEOUT HANDLING

        // override normal state adding
        self.add = function(name, creator) {
            self.states.add(name, function(name, opts) {
                if (!interrupt || !go.utils.timed_out(self.im))
                    return creator(name, opts);
                interrupt = false;
                opts = opts || {};
                opts.name = name;
                // Prevent previous content being passed to next state
                self.im.msg.content = null;
                return self.states.create('state_msisdn_permission', opts);
            });
        };


    // START STATE

        // ROUTING
        self.states.add('state_start', function() {
            // Reset user answers when restarting the app
            self.im.user.answers = {};
            return go.utils
                .get_or_create_identity({'msisdn': self.im.user.addr}, self.im, null)
                .then(function(user) {
                    self.im.user.set_answer('user_id', user.id);
                    if (user.details.receiver_role) {
                        self.im.user.set_answer('role_player', user.details.receiver_role);
                        return self.states.create('state_msisdn_permission');
                    } else {
                        self.im.user.set_answer('role_player', 'guest');
                        return self.states.create('state_language');
                    }
                });
        });


    // INITIAL STATES

        // ChoiceState st-B
        self.add('state_msisdn_permission', function(name) {
            return new ChoiceState(name, {
                question: $(questions[name]),
                choices: [
                    new Choice('state_check_receiver_role', $("Yes")),
                    new Choice('state_msisdn_no_permission', $("No")),
                    new Choice('state_registered_msisdn', $("Change the number I'd like to manage"))
                ],
                error: $(get_error_text(name)),
                next: function(choice) {
                    if (choice.value === 'state_check_receiver_role') {
                        self.im.user.set_answer('contact_id', self.im.user.answers.user_id);
                    }
                    return choice.value;
                }
            });
        });

        // unnamed on flow diagram
        self.add('state_msisdn_no_permission', function(name) {
            return new EndState(name, {
                text: $(questions[name]),
                next: 'state_start'
            });
        });

        // ChoiceState st-D
        self.add('state_language', function(name) {
            return new ChoiceState(name, {
                question: $(questions[name]),
                choices: [
                    new Choice('english', $("English")),
                    new Choice('hausa', $("Hausa")),
                    new Choice('igbo', $("Igbo")),
                    new Choice('pidgin', $('Pidgin')),
                    new Choice('yoruba', $('Yoruba'))
                ],
                error: $(get_error_text(name)),
                next: 'state_registered_msisdn'
            });
        });

        // FreeText st-C
        self.add('state_registered_msisdn', function(name) {
            return new FreeText(name, {
                question: $(questions[name]),
                check: function(content) {
                    if (go.utils.is_valid_msisdn(content)) {
                        return null;  // vumi expects null or undefined if check passes
                    } else {
                        return $(get_error_text(name));
                    }
                },
                next: 'state_check_registered'
            });
        });

        // Interstitial - determine contact registration
        self.states.add('state_check_registered', function() {
            var msisdn = go.utils.normalize_msisdn(
                self.im.user.answers.state_registered_msisdn,
                self.im.config.country_code
            );
            return go.utils
                .get_identity_by_address({'msisdn': msisdn}, self.im)
                .then(function(contact) {
                    if (contact.details.receiver_role) {
                        self.im.user.set_answer('role_player', contact.details.receiver_role);
                        self.im.user.set_answer('contact_id', contact.id);
                        return self.states.create('state_check_receiver_role');
                    } else {
                        return self.states.create('state_msisdn_not_recognised');
                    }
                });
        });

        // EndState st-F
        self.add('state_msisdn_not_recognised', function(name) {
            return new EndState(name, {
                text: $(questions[name]),
                next: 'state_start'
            });
        });

        // Interstitial - before main menu
        self.add('state_check_receiver_role', function(name) {
            var role = self.im.user.answers.role_player;
            var contact_id = self.im.user.answers.contact_id;
            if (role === 'mother') {
                // lookup contact so we can get the link to the household receiver (if any)
                return go.utils
                    .get_identity(contact_id, self.im)
                    .then(function(mother) {
                        self.im.user.set_answer('mother_id', contact_id);
                        self.im.user.set_answer('mother_msisdn',
                            Object.keys(mother.details.addresses.msisdn)[0]);
                        if (mother.details.linked_to) {
                            self.im.user.set_answer('household_id', mother.details.linked_to);
                            self.im.user.set_answer('seperate_household_receiver', true);
                            self.im.user.set_answer('reg_type', 'mother_and_other');
                            // lookup household so we can save their msisdn
                            return go.utils
                                .get_identity(self.im.user.answers.household_id, self.im)
                                .then(function(household) {
                                    self.im.user.set_answer('household_msisdn',
                                        Object.keys(household.details.addresses.msisdn)[0]);
                                    return self.states.create('state_main_menu');
                                });
                        } else {
                            // mother_only
                            self.im.user.set_answer('household_id', null);
                            self.im.user.set_answer('seperate_household_receiver', false);
                            self.im.user.set_answer('reg_type', 'mother_only');
                            return self.states.create('state_main_menu');
                        }
                    });
            } else {
                // lookup contact so we can get the link to the mother
                return go.utils
                    .get_identity(contact_id, self.im)
                    .then(function(contact) {
                        self.im.user.set_answer('household_id', contact_id);
                        self.im.user.set_answer('mother_id', contact.details.linked_to);
                        self.im.user.set_answer('household_msisdn',
                            Object.keys(contact.details.addresses.msisdn)[0]);
                        if (contact.details.household_msgs_only) {
                            // set true for mother_friend, mother_family, mother_father identification
                            self.im.user.set_answer('seperate_household_receiver', true);
                            self.im.user.set_answer('reg_type', 'mother_and_other');
                            // lookup mother so we can save her msisdn
                            return go.utils
                                .get_identity(self.im.user.answers.mother_id, self.im)
                                .then(function(mother) {
                                    self.im.user.set_answer('mother_msisdn',
                                        Object.keys(mother.details.addresses.msisdn)[0]);
                                    return self.states.create('state_main_menu_household');
                                });
                        } else {
                            // set false for friend_only, family_only, father_only identification
                            // cannot set mother msisdn as it doesn't exist
                            self.im.user.set_answer('seperate_household_receiver', false);
                            self.im.user.set_answer('reg_type', 'other_only');
                            return self.states.create('state_main_menu');
                        }
                    });
            }
        });

        // ChoiceState st-A
        self.add('state_main_menu', function(name) {
            return new ChoiceState(name, {
                question: $(questions[name]),
                choices: [
                    new Choice('state_check_baby_subscription', $("Start Baby messages")),
                    new Choice('state_check_msg_type', $("Change message preferences")),
                    new Choice('state_new_msisdn', $("Change my number")),
                    new Choice('state_msg_language', $("Change language")),
                    new Choice('state_optout_reason', $("Stop receiving messages"))
                ],
                error: $(get_error_text(name)),
                next: function(choice) {
                    return choice.value;
                }
            });
        });

        // ChoiceState st-A1
        self.add('state_main_menu_household', function(name) {
            return new ChoiceState(name, {
                question: $(questions[name]),
                choices: [
                    new Choice('state_check_baby_subscription', $("Start Baby messages")),
                    new Choice('state_new_msisdn', $("Change my number")),
                    new Choice('state_msg_language', $("Change language")),
                    new Choice('state_optout_reason', $("Stop receiving messages"))
                ],
                error: $(get_error_text(name)),
                next: function(choice) {
                    return choice.value;
                }
            });
        });


    // BABY CHANGE STATES

        // Interstitials
        self.add('state_check_baby_subscription', function(name) {
            return go.utils_project
                .check_postbirth_subscription(self.im, self.im.user.answers.mother_id)
                .then(function(postbirth_sub) {
                    if (postbirth_sub === true) {
                        return self.states.create('state_already_registered_baby');
                    } else if (postbirth_sub === 'no_active_subs_found') {
                        return self.states.create('state_baby_switch_broken');  // TODO #101
                    } else {
                        return self.states.create('state_change_baby');
                    }
                });
        });

        // ChoiceState st-01
        self.add('state_already_registered_baby', function(name) {
            return new ChoiceState(name, {
                question: $(questions[name]),
                error: $(get_error_text(name)),
                choices: [
                    new Choice('state_check_receiver_role', $("Back to main menu")),
                    new Choice('state_end_exit', $("Exit"))
                ],
                next: function(choice) {
                    return choice.value;
                }
            });
        });

        self.add('state_change_baby', function(name) {
            return go.utils_project
                .switch_to_baby(self.im, self.im.user.answers.mother_id)
                .then(function() {
                    return self.states.create('state_new_registration_baby');
                });
        });

        // EndState st-02
        self.add('state_new_registration_baby', function(name) {
            return new EndState(name, {
                text: $(questions[name]),
                next: 'state_start'
            });
        });


    // MSG CHANGE STATES

        self.add('state_check_msg_type', function(name) {
            return go.utils_project
                .get_subscription_msg_type(self.im, self.im.user.answers.mother_id)
                .then(function(msg_format) {
                    self.im.user.set_answer('msg_format', msg_format);
                    if (msg_format === 'text') {
                        return self.states.create('state_change_menu_sms');
                    } else if (msg_format === 'audio') {
                        return self.states.create('state_change_menu_voice');
                    } else {
                        return self.states.create('state_end_exit');
                    }
                });
        });

        // ChoiceState st-03
        self.add('state_change_menu_sms', function(name) {
            return new ChoiceState(name, {
                question: $(questions[name]),
                error: $(get_error_text(name)),
                choices: [
                    new Choice('to_voice', $("Change from text to voice messages")),
                    new Choice('back', $("Back to main menu"))
                ],
                next: function(choice) {
                    return choice.value === 'to_voice'
                        ? 'state_voice_days'
                        : 'state_check_receiver_role';
                }
            });
        });

        // ChoiceState st-04
        self.add('state_voice_days', function(name) {
            return new ChoiceState(name, {
                question: $(questions[name]),
                error: $(get_error_text(name)),
                choices: [
                    new Choice('mon_wed', $("Monday and Wednesday")),
                    new Choice('tue_thu', $("Tuesday and Thursday"))
                ],
                next: 'state_voice_times'
            });
        });

        // ChoiceState st-05
        self.add('state_voice_times', function(name) {
            return new ChoiceState(name, {
                question: $(questions[name]),
                error: $(get_error_text(name)),
                choices: [
                    new Choice('9_11', $("Between 9-11am")),
                    new Choice('2_5', $("Between 2-5pm"))
                ],
                next: function(choice) {
                    return go.utils_project
                        .update_msg_format_time(
                            self.im,
                            'audio',
                            self.im.user.answers.state_voice_days,
                            choice.value
                        )
                        .then(function() {
                            return 'state_end_voice_confirm';
                        });
                }
            });
        });

        // EndState st-06
        self.add('state_end_voice_confirm', function(name) {
            return new EndState(name, {
                text: $(questions[name]),
                next: 'state_start'
            });
        });

        // ChoiceState st-07
        self.add('state_change_menu_voice', function(name) {
            return new ChoiceState(name, {
                question: $(questions[name]),
                error: $(get_error_text(name)),
                choices: [
                    new Choice('state_voice_days', $("Change the day and time I receive messages")),
                    new Choice('state_end_sms_confirm', $("Change from voice to text messages")),
                    new Choice('state_check_receiver_role', $("Back to main menu"))
                ],
                next: function(choice) {
                    if (choice.value !== 'state_end_sms_confirm') {
                        return choice.value;
                    } else {
                        return go.utils_project
                            .update_msg_format_time(
                                self.im,
                                'text',
                                null,
                                null
                            )
                            .then(function() {
                                return 'state_end_sms_confirm';
                            });
                    }
                }
            });
        });

        // EndState st-08
        self.add('state_end_sms_confirm', function(name) {
            return new EndState(name, {
                text: $(questions[name]),
                next: 'state_start'
            });
        });


    // NUMBER CHANGE STATES

        // FreeText st-09
        self.add('state_new_msisdn', function(name) {
            return new FreeText(name, {
                question: $(questions[name]),
                check: function(content) {
                    if (go.utils.is_valid_msisdn(content)) {
                        return null;  // vumi expects null or undefined if check passes
                    } else {
                        return $(get_error_text(name));
                    }
                },
                next: function(content) {
                    var msisdn = go.utils.normalize_msisdn(
                        content, self.im.config.country_code);
                    return go.utils
                        .get_identity_by_address({'msisdn': msisdn}, self.im)
                        .then(function(identity) {
                            if (identity && identity.details && identity.details.receiver_role) {
                                return 'state_number_in_use';
                            } else {
                                return {
                                    'name': 'state_update_number',
                                    'creator_opts': {'new_msisdn': msisdn}
                                };
                            }
                        });
                }
            });
        });

        // ChoiceState
        self.add('state_number_in_use', function(name) {
            return new ChoiceState(name, {
                question: $(questions[name]),
                error: $(get_error_text(name)),
                choices: [
                    new Choice('state_new_msisdn', $("Try a different number")),
                    new Choice('state_end_exit', $("Exit"))
                ],
                next: function(choice) {
                    return choice.value;
                }
            });
        });

        // Interstitial
        self.add('state_update_number', function(name, creator_opts) {
            return go.utils
                .get_identity(self.im.user.answers.contact_id, self.im)
                .then(function(contact) {
                    // TODO #70: Handle multiple addresses, currently overwrites existing
                    // on assumption we're dealing with one msisdn only
                    contact.details.addresses.msisdn = {};
                    contact.details.addresses.msisdn[creator_opts.new_msisdn] = {};
                    return go.utils
                        .update_identity(self.im, contact)
                        .then(function() {
                            return self.states.create('state_end_number_change');
                        });
                });
        });

        // EndState st-10
        self.add('state_end_number_change', function(name) {
            return new EndState(name, {
                text: $(questions[name]),
                next: 'state_start'
            });
        });


    // LANGUAGE CHANGE STATES

        // ChoiceState st-11
        self.add('state_msg_language', function(name) {
            return new ChoiceState(name, {
                question: $(questions[name]),
                error: $(get_error_text(name)),
                choices: [
                    new Choice('english', $("English")),
                    new Choice('hausa', $("Hausa")),
                    new Choice('igbo', $("Igbo")),
                    new Choice('pidgin', $('Pidgin')),
                    new Choice('yoruba', $('Yoruba'))
                ],
                next: 'state_change_language'
            });
        });

        self.add('state_change_language', function(name) {
            return go.utils_project
                .change_language(
                    self.im,
                    self.im.user.answers.state_msg_language,
                    self.im.user.answers.mother_id,
                    self.im.user.answers.household_id
                )
                .then(function() {
                    return self.states.create('state_msg_language_confirm');
                });
        });

        // EndState st-12
        self.add('state_msg_language_confirm', function(name) {
            return new EndState(name, {
                text: $(questions[name]),
                next: 'state_start'
            });
        });


    // OPTOUT STATES

        // ChoiceState st-13
        self.add('state_optout_reason', function(name) {
            return new ChoiceState(name, {
                question: $(questions[name]),
                error: $(get_error_text(name)),
                choices: [
                    new Choice('miscarriage', $("Mother miscarried")),
                    new Choice('stillborn', $("Baby stillborn")),
                    new Choice('baby_death', $("Baby passed away")),
                    new Choice('not_useful', $("Messages not useful")),
                    new Choice('other', $("Other"))
                ],
                next: function(choice) {
                    switch (choice.value) {
                        case 'miscarriage': return 'state_loss_subscription';
                        case 'stillborn': return 'state_optout_all';
                        case 'baby_death': return 'state_optout_all';
                        case 'not_useful': return 'state_check_subscription';
                        case 'other': return 'state_check_subscription';
                    }
                }
            });
        });

        // interstitial
        self.states.add('state_check_subscription', function() {
            var contact_id = self.im.user.answers.contact_id;
            return go.utils
                .get_identity(contact_id, self.im)
                .then(function(contact) {
                    //  and mother_only subscriptions bypass to end state state_end_optout
                    if (self.im.user.answers.reg_type === 'mother_only') {
                        return go.utils_project
                            .optout_mother(self.im, 'ussd_public')
                            .then(function() {
                                return self.states.create('state_end_optout');
                            });
                    } else if (self.im.user.answers.reg_type === 'mother_and_other' &&
                         self.im.user.answers.role_player !== 'mother') {
                        return go.utils_project
                            .optout_household(self.im, 'ussd_public')
                            .then(function() {
                                return self.states.create('state_end_optout');
                            });
                    } else {
                        return self.states.create("state_optout_receiver");
                    }
                });
        });

        // ChoiceState st-14
        self.add('state_loss_subscription', function(name) {
            return new ChoiceState(name, {
                question: $(questions[name]),
                error: $(get_error_text(name)),
                choices: [
                    new Choice('state_switch_loss', $("Yes")),
                    new Choice('state_optout_all', $("No"))
                ],
                next: function(choice) {
                    return choice.value;
                }
            });
        });

        self.add('state_optout_all', function(name) {
            if (self.im.user.answers.household_id === null) {
                return go.utils_project
                    .optout_mother(self.im, 'ussd_public')
                    .then(function() {
                        if (self.im.user.answers.state_optout_reason === 'not_useful' ||
                            self.im.user.answers.state_optout_reason === 'other') {
                            return self.states.create('state_end_optout');
                        } else {
                            return self.states.create('state_end_loss');
                        }
                    });
            } else if (self.im.user.answers.reg_type === 'other_only') {
                return go.utils_project
                    .optout_household(self.im, 'ussd_public')
                    .then(function() {
                        if (self.im.user.answers.state_optout_reason === 'not_useful' ||
                            self.im.user.answers.state_optout_reason === 'other') {
                            return self.states.create('state_end_optout');
                        } else {
                            return self.states.create('state_end_loss');
                        }
                    });
            } else {
                return Q
                    .all([
                        go.utils_project.optout_mother(self.im, 'ussd_public'),
                        go.utils_project.optout_household(self.im, 'ussd_public')
                    ])
                    .then(function() {
                        if (self.im.user.answers.state_optout_reason === 'not_useful' ||
                            self.im.user.answers.state_optout_reason === 'other') {
                            return self.states.create('state_end_optout');
                        } else {
                            return self.states.create('state_end_loss');
                        }
                    });
            }
        });

        self.add('state_switch_loss', function(name) {
            return go.utils_project
                .switch_to_loss(self.im, self.im.user.answers.mother_id,
                                self.im.user.answers.state_optout_reason)
                .then(function() {
                    if (self.im.user.answers.household_id &&
                        self.im.user.answers.seperate_household_receiver === true) {
                        return go.utils_project
                            .optout_household(self.im, 'ussd_public')
                            .then(function() {
                                return self.states.create('state_end_loss_subscription_confirm');
                            });
                    } else if (self.im.user.answers.household_id &&
                               self.im.user.answers.seperate_household_receiver === false) {
                        return go.utils_project
                            .unsub_household(self.im, self.im.user.answers.mother_id,
                                             self.im.user.answers.household_id,
                                             self.im.user.answers.state_optout_reason)
                            .then(function() {
                                return self.states.create('state_end_loss_subscription_confirm');
                            });
                    } else {
                        return self.states.create('state_end_loss_subscription_confirm');
                    }
                });
        });

        // EndState st-15
        self.add('state_end_loss_subscription_confirm', function(name) {
            return new EndState(name, {
                text: $(questions[name]),
                next: 'state_start'
            });
        });

        // ChoiceState st-16
        self.add('state_optout_receiver', function(name) {
            return new ChoiceState(name, {
                question: $(questions[name]),
                error: $(get_error_text(name)),
                choices: [
                    new Choice('mother', $("Mother messages")),
                    new Choice('household', $("Household messages")),
                    new Choice('all', $("All messages"))
                ],
                next: function(choice) {
                    switch (choice.value) {
                        case 'mother':
                            if (self.im.user.answers.reg_type === 'other_only') {
                                return go.utils_project
                                    .unsub_mother(self.im, self.im.user.answers.mother_id,
                                                  self.im.user.answers.household_id,
                                                  self.im.user.answers.state_optout_reason)
                                    .then(function() {
                                        return 'state_end_optout';
                                    });
                            } else {
                                return go.utils_project
                                    .optout_mother(self.im, 'ussd_public')
                                    .then(function() {
                                        return 'state_end_optout';
                                    });
                            }
                            break;
                        case 'household':
                            // unsubscribe from household messages only
                            if (self.im.user.answers.reg_type === 'other_only') {
                                return go.utils_project
                                    .unsub_household(self.im, self.im.user.answers.mother_id,
                                                     self.im.user.answers.household_id,
                                                     self.im.user.answers.state_optout_reason)
                                    .then(function() {
                                        return 'state_end_optout';
                                    });
                            // opt out household messages receiver
                            } else {
                                return go.utils_project
                                    .optout_household(self.im, 'ussd_public')
                                    .then(function() {
                                        return 'state_end_optout';
                                    });
                            }
                            break;
                        case 'all':
                            if (self.im.user.answers.reg_type === 'other_only') {
                                return Q
                                    .all([
                                        go.utils_project.unsub_mother(
                                            self.im, self.im.user.answers.mother_id,
                                            self.im.user.answers.household_id,
                                            self.im.user.answers.state_optout_reason
                                        ),
                                        go.utils_project.optout_household(self.im, 'ussd_public')
                                    ])
                                    .then(function() {
                                        return 'state_end_optout';
                                    });
                            } else {
                                return Q
                                    .all([
                                        go.utils_project.optout_mother(self.im, 'ussd_public'),
                                        go.utils_project.optout_household(self.im, 'ussd_public')
                                    ])
                                    .then(function() {
                                        return 'state_end_optout';
                                    });
                            }
                    }
                }
            });
        });

        // EndState st-17
        self.add('state_end_optout', function(name) {
            return new EndState(name, {
                text: $(questions[name]),
                next: 'state_start'
            });
        });

        // EndState st-21
        self.add('state_end_loss', function(name) {
            return new EndState(name, {
                text: $(questions[name]),
                next: 'state_start'
            });
        });


    // GENERAL END STATE

        // EndState st-18
        self.add('state_end_exit', function(name) {
            return new EndState(name, {
                text: $(questions[name]),
                next: 'state_start'
            });
        });

    });

    return {
        GoApp: GoApp
    };
}();
