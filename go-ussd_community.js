// WARNING: This is a generated file.
//          If you edit it you will be sad.
//          Edit src/app.js instead.

var go = {};
go;

/*jshint -W083 */
var vumigo = require('vumigo_v02');
var moment = require('moment');
var assert = require('assert');
var JsonApi = vumigo.http.api.JsonApi;
var Choice = vumigo.states.Choice;
var url_utils = require('url');
var Q = require('q');

// GENERIC UTILS
go.utils = {

// FIXTURES HELPERS

    check_fixtures_used: function(api, expected_used) {
        var fixts = api.http.fixtures.fixtures;
        var fixts_used = [];
        fixts.forEach(function(f, i) {
            f.uses > 0 ? fixts_used.push(i) : null;
        });
        assert.deepEqual(fixts_used, expected_used);
    },

// TIMEOUT HELPERS

    timed_out: function(im) {
        return im.msg.session_event === 'new'
            && im.user.state.name
            && im.config.no_timeout_redirects.indexOf(im.user.state.name) === -1;
    },

    timeout_redirect: function(im) {
        return im.config.timeout_redirects.indexOf(im.user.state.name) !== -1;
    },


// SERVICE API CALL HELPERS

    /**: get_paginated_response(service, endpoint, params)
    Gets all pages of a paginated request.

    :param string service: The name of the service being queried.
    :param string endpoint: The url endpoint to send the request to.
    :param object params: The query parameters for the request
    :param object im:
    */
    get_paginated_response: function(service, endpoint, params, im) {
        // Get the current page and log the call
        return go.utils
            .service_api_call(service, 'get', params, null, endpoint, im)
            .then(function(response) {
                var results = response.data.results;
                if (response.data.next === null) {
                    return {results: results, count: results.length};
                }
                var next_url = url_utils.parse(response.data.next, true);
                // Recursively get next pages
                return go.utils.
                    get_paginated_response(service, endpoint, next_url.query, im)
                    .then(function(page) {
                        // Tack subsequent pages onto current page
                        var combined_results = results.concat(page.results);
                        return {results: combined_results,
                                count:combined_results.length};
                    });
            });
    },

    service_api_call: function (service, method, params, payload, endpoint, im) {
        var http = new JsonApi(im, {
            headers: {
                'Authorization': ['Token ' + im.config.services[service].api_token]
            }
        });
        switch (method) {
            case "post":
                return http.post(im.config.services[service].url + endpoint, {
                        data: payload
                    })
                    .then(go.utils.log_service_api_call(service, method, params, payload, endpoint, im));
            case "get":
                return http.get(im.config.services[service].url + endpoint, {
                        params: params
                    })
                    .then(go.utils.log_service_api_call(service, method, params, payload, endpoint, im));
            case "patch":
                return http.patch(im.config.services[service].url + endpoint, {
                        data: payload
                    })
                    .then(go.utils.log_service_api_call(service, method, params, payload, endpoint, im));
            case "put":
                return http.put(im.config.services[service].url + endpoint, {
                    params: params,
                    data: payload
                })
                .then(go.utils.log_service_api_call(service, method, params, payload, endpoint, im));
            case "delete":
                return http
                    .delete(im.config.services[service].url + endpoint)
                    .then(go.utils.log_service_api_call(service, method, params, payload, endpoint, im));
            }
    },

    log_service_api_call: function(service, method, params, payload, endpoint, im) {
        return function (response) {
            return im
                .log([
                    'Request: ' + method + ' ' + im.config.services[service].url + endpoint,
                    'Payload: ' + JSON.stringify(payload),
                    'Params: ' + JSON.stringify(params),
                    'Response: ' + JSON.stringify(response),
                ].join('\n'))
                .then(function () {
                    return response;
                });
        };
    },


// MSISDN HELPERS

    // Check that it's a number and starts with 0 and approximate length
    // TODO: refactor to take length, explicitly deal with '+'
    is_valid_msisdn: function(content) {
        return go.utils.check_valid_number(content)
            && content[0] === '0'
            && content.length == 11;
    },

    normalize_msisdn: function(raw, country_code) {
        // don't touch shortcodes
        if (raw.length <= 5) {
            return raw;
        }
        // remove chars that are not numbers or +
        raw = raw.replace(/[^0-9+]/g);
        if (raw.substr(0,2) === '00') {
            return '+' + raw.substr(2);
        }
        if (raw.substr(0,1) === '0') {
            return '+' + country_code + raw.substr(1);
        }
        if (raw.substr(0,1) === '+') {
            return raw;
        }
        if (raw.substr(0, country_code.length) === country_code) {
            return '+' + raw;
        }
        return raw;
    },


// NUMBER HELPERS

    // An attempt to solve the insanity of JavaScript numbers
    check_valid_number: function(content) {
        var numbers_only = new RegExp('^\\d+$');
        return content !== ''
            && numbers_only.test(content)
            && !Number.isNaN(Number(content));
    },

    check_number_in_range: function(content, lower, upper) {
      if (go.utils.check_valid_number(content)) {
        var number = parseInt(content);
        return (number >= lower && number <= upper);
      }
      return false;
    },

    double_digit_number: function(input) {
        input_numeric = parseInt(input, 10);
        if (parseInt(input, 10) < 10) {
            return "0" + input_numeric.toString();
        } else {
            return input_numeric.toString();
        }
    },


// DATE HELPERS

    get_today: function(config) {
        if (config.testing_today) {
            return new moment(config.testing_today, 'YYYY-MM-DD');
        } else {
            return new moment();
        }
    },

    get_january: function(config) {
        // returns current year january 1st moment date
        return go.utils.get_today(config).startOf('year');
    },

    is_valid_date: function(date, format) {
        // implements strict validation with 'true' below
        return moment(date, format, true).isValid();
    },

    is_valid_year: function(year, minYear, maxYear) {
        // expects string parameters
        // checks that the number is within the range determined by the
        // minYear & maxYear parameters
        return go.utils.check_valid_number(year)
            && parseInt(year, 10) >= parseInt(minYear, 10)
            && parseInt(year, 10) <= parseInt(maxYear, 10);
    },

    is_valid_day_of_month: function(input) {
        // check that it is a number and between 1 and 31
        return go.utils.check_valid_number(input)
            && parseInt(input, 10) >= 1
            && parseInt(input, 10) <= 31;
    },


// TEXT HELPERS

    check_valid_alpha: function(input) {
        // check that all chars are in standard alphabet
        var alpha_only = new RegExp('^[A-Za-z]+$');
        return input !== '' && alpha_only.test(input);
    },

    is_valid_name: function(input, min, max) {
        // check that the string does not include the characters listed in the
        // regex, and min <= input string length <= max
        var name_check = new RegExp(
            '(^[^±!@£$%^&*_+§¡€#¢§¶•ªº«\\/<>?:;|=.,0123456789]{min,max}$)'
            .replace('min', min.toString())
            .replace('max', max.toString())
        );
        return input !== '' && name_check.test(input);
    },

    get_clean_first_word: function(user_message) {
        return user_message
            .split(" ")[0]          // split off first word
            .replace(/\W/g, '')     // remove non letters
            .toUpperCase();         // capitalise
    },


// CHOICE HELPERS

    make_month_choices: function($, startDate, limit, increment, valueFormat, labelFormat) {
      // Currently supports month translation in formats MMMM and MM

        var choices = [];
        var monthIterator = startDate;
        for (var i=0; i<limit; i++) {
            var raw_label = monthIterator.format(labelFormat);
            var prefix, suffix, month, translation;

            var quad_month_index = labelFormat.indexOf("MMMM");
            var trip_month_index = labelFormat.indexOf("MMM");

            if (quad_month_index > -1) {
                month = monthIterator.format("MMMM");
                prefix = raw_label.substring(0, quad_month_index);
                suffix = raw_label.substring(quad_month_index+month.length, raw_label.length);
                translation = {
                    January: $("{{pre}}January{{post}}"),
                    February: $("{{pre}}February{{post}}"),
                    March: $("{{pre}}March{{post}}"),
                    April: $("{{pre}}April{{post}}"),
                    May: $("{{pre}}May{{post}}"),
                    June: $("{{pre}}June{{post}}"),
                    July: $("{{pre}}July{{post}}"),
                    August: $("{{pre}}August{{post}}"),
                    September: $("{{pre}}September{{post}}"),
                    October: $("{{pre}}October{{post}}"),
                    November: $("{{pre}}November{{post}}"),
                    December: $("{{pre}}December{{post}}"),
                };
                translated_label = translation[month].context({
                    pre: prefix,
                    post: suffix
                });
            } else if (trip_month_index > -1) {
                month = monthIterator.format("MMM");
                prefix = raw_label.substring(0, trip_month_index);
                suffix = raw_label.substring(trip_month_index+month.length, raw_label.length);
                translation = {
                    Jan: $("{{pre}}Jan{{post}}"),
                    Feb: $("{{pre}}Feb{{post}}"),
                    Mar: $("{{pre}}Mar{{post}}"),
                    Apr: $("{{pre}}Apr{{post}}"),
                    May: $("{{pre}}May{{post}}"),
                    Jun: $("{{pre}}Jun{{post}}"),
                    Jul: $("{{pre}}Jul{{post}}"),
                    Aug: $("{{pre}}Aug{{post}}"),
                    Sep: $("{{pre}}Sep{{post}}"),
                    Oct: $("{{pre}}Oct{{post}}"),
                    Nov: $("{{pre}}Nov{{post}}"),
                    Dec: $("{{pre}}Dec{{post}}"),
                };
                translated_label = translation[month].context({
                    pre: prefix,
                    post: suffix
                });
            } else {
                // assume numbers don't need translation
                translated_label = raw_label;
            }

            choices.push(new Choice(monthIterator.format(valueFormat),
                                    translated_label));
            monthIterator.add(increment, 'months');
        }

        return choices;
    },


// REGISTRATION HELPERS

    create_registration: function(im, reg_info) {
        return go.utils
            .service_api_call("registrations", "post", null, reg_info, "registration/", im)
            .then(function(result) {
                return result.id;
            });
    },


// IDENTITY HELPERS

    get_identity_by_address: function(address, im) {
      // Searches the Identity Store for all identities with the provided address.
      // Returns the first identity object found
      // Address should be an object {address_type: address}, eg.
      // {'msisdn': '0821234444'}, {'email': 'me@example.com'}

        var address_type = Object.keys(address)[0];
        var address_val = address[address_type];
        var params = {};
        var search_string = 'details__addresses__' + address_type;
        params[search_string] = address_val;

        return im
            .log('Getting identity for: ' + JSON.stringify(params))
            .then(function() {
                return go.utils
                    .get_paginated_response('identities', 'identities/search/', params, im)
                    .then(function(json_get_response) {
                        var identities_found = json_get_response.results;
                        // Return the first identity in the list of identities
                        return (identities_found.length > 0)
                        ? identities_found[0]
                        : null;
                    });
            });
    },

    get_identity: function(identity_id, im) {
      // Gets the identity from the Identity Store
      // Returns the identity object
        var endpoint = 'identities/' + identity_id + '/';
        return go.utils
        .service_api_call('identities', 'get', {}, null, endpoint, im)
        .then(function(json_get_response) {
            return json_get_response.data;
        });
    },

    create_identity: function(im, address, communicate_through_id, operator_id) {
      // Create a new identity
      // Returns the identity object

        var payload = {
            "details": {
                "default_addr_type": null,
                "addresses": {}
            }
        };
        // compile base payload
        if (address) {
            var address_type = Object.keys(address);
            var addresses = {};
            addresses[address_type] = {};
            addresses[address_type][address[address_type]] = {};
            payload.details = {
                "default_addr_type": "msisdn",
                "addresses": addresses
            };
        }

        if (communicate_through_id) {
            payload.communicate_through = communicate_through_id;
        }

        // add operator_id if available
        if (operator_id) {
            payload.operator = operator_id;
        }

        return go.utils
            .service_api_call("identities", "post", null, payload, 'identities/', im)
            .then(function(json_post_response) {
                return json_post_response.data;
            });
    },

    get_or_create_identity: function(address, im, operator_id) {
      // Gets a identity if it exists, otherwise creates a new one

        if (address.msisdn) {
            address.msisdn = go.utils
                .normalize_msisdn(address.msisdn, im.config.country_code);
        }
        return go.utils
            // Get identity id using address
            .get_identity_by_address(address, im)
            .then(function(identity) {
                if (identity !== null) {
                    // If identity exists, return the id
                    return identity;
                } else {
                    // If identity doesn't exist, create it
                    return go.utils
                    .create_identity(im, address, null, operator_id)
                    .then(function(identity) {
                        return identity;
                    });
                }
        });
    },

    update_identity: function(im, identity, optin) {
      // Update an identity by passing in the full updated identity object
      // Removes potentially added fields that auto-complete and should not
      // be submitted
      // Returns the id (which should be the same as the identity's id)

        auto_fields = ["url", "created_at", "updated_at", "created_by", "updated_by", "user"];
        for (var i in auto_fields) {
            field = auto_fields[i];
            if (field in identity) {
                delete identity[field];
            }
        }

        if (optin) {
            if (identity.details && identity.details.addresses && identity.details.addresses.msisdn){
                if (identity.details.opted_out){
                    delete identity.details.opted_out;
                }

                for (var msisdn in identity.details.addresses.msisdn) {
                    if ("optedout" in identity.details.addresses.msisdn[msisdn]){
                        delete identity.details.addresses.msisdn[msisdn].optedout;
                    }
                }
            }
        }

        var endpoint = 'identities/' + identity.id + '/';
        return go.utils
            .service_api_call('identities', 'patch', {}, identity, endpoint, im)
            .then(function(response) {
                return response.data.id;
            });
    },


// SUBSCRIPTION HELPERS

    get_subscription: function(im, subscription_id) {
      // Gets the subscription from the Stage-base Store
      // Returns the subscription object

        var endpoint = 'subscriptions/' + subscription_id + '/';
        return go.utils
            .service_api_call('subscriptions', 'get', {}, null, endpoint, im)
            .then(function(response) {
                return response.data;
            });
    },

    get_active_subscriptions_by_identity: function(im, identity_id) {
      // Searches the Stage-base Store for all active subscriptions with the provided identity_id
      // Returns the first subscription object found or null if none are found

        var params = {
            identity: identity_id,
            active: "True"
        };
        var endpoint = 'subscriptions/';
        return go.utils
            .get_paginated_response('subscriptions', endpoint, params, im)
            .then(function(response) {
                return response.results;
            });
    },

    get_active_subscription_by_identity: function(im, identity_id) {
      // Searches the Stage-base Store for all active subscriptions with the provided identity_id
      // Returns the first subscription object found or null if none are found

        return go.utils
            .get_active_subscriptions_by_identity(im, identity_id)
            .then(function(subscriptions_found) {
                return (subscriptions_found.length > 0)
                    ? subscriptions_found[0]
                    : null;
            });
    },

    has_active_subscription: function(identity_id, im) {
      // Returns whether an identity has an active subscription
      // Returns true / false

        return go.utils
            .get_active_subscriptions_by_identity(im, identity_id)
            .then(function(subscriptions) {
                return subscriptions.length > 0;
            });
    },

    update_subscription: function(im, subscription) {
      // Update a subscription by passing in the full updated subscription object
      // Returns the id (which should be the same as the subscription's id)

        var endpoint = 'subscriptions/' + subscription.id + '/';
        return go.utils
            .service_api_call('subscriptions', 'patch', {}, subscription, endpoint, im)
            .then(function(response) {
                return response.data.id;
            });
    },

    resend_all_subscriptions: function(im, identity) {
        return go.utils
            .get_active_subscriptions_by_identity(im, identity.id)
            .then(function(subscriptions){
                var promises = [];
                promises = subscriptions.map(function(result){
                    var endpoint = 'subscriptions/' + result.id + '/resend';
                    return go.utils.service_api_call('subscriptions', 'post', {}, {}, endpoint, im);
                });
                return Q.all(promises);
            });
    },


// MESSAGESET HELPERS

    get_messageset: function(im, messageset_id) {
      // Gets the messageset from the Stage-base Store
      // Returns the messageset object

        var endpoint = 'messageset/' + messageset_id + '/';
        return go.utils
            .service_api_call('subscriptions', 'get', {}, null, endpoint, im)
            .then(function(response) {
                return response.data;
            });
    },


// MESSAGE_SENDER HELPERS

    save_inbound_message: function(im, from_addr, content) {
      // Saves the inbound messages to seed-message-sender

        var payload = {
            "message_id": im.config.testing_message_id || im.msg.message_id,
            "in_reply_to": null,
            "to_addr": im.config.channel,
            "from_addr": from_addr,
            "content": content,
            "transport_name": im.config.transport_name,
            "transport_type": im.config.transport_type,
            "helper_metadata": {}
        };
        return go.utils
            .service_api_call("message_sender", "post", null, payload, 'inbound/', im)
            .then(function(json_post_response) {
                var inbound_response = json_post_response.data;
                // Return the inbound id
                return inbound_response.id;
            });
    },


// OPTOUT & OPTIN HELPERS

    optout: function(im, identity_id, optout_reason, address_type, address,
                     request_source, requestor_source_id, optout_type, config) {
      // Posts an optout to the identity store optout endpoint

        var optout_info = {
            optout_type: optout_type || 'stop',  // default to 'stop'
            identity: identity_id,
            reason: optout_reason || 'unknown',  // default to 'unknown'
            address_type: address_type || 'msisdn',  // default to 'msisdn'
            address: address,
            request_source: request_source,
            requestor_source_id: requestor_source_id
        };
        return go.utils
            .service_api_call("identities", "post", null, optout_info, "optout/", im)
            .then(function(response) {
                return response;
            });
    },


"commas": "commas"
};

/*jshint -W083 */
var Q = require('q');
var moment = require('moment');
var vumigo = require('vumigo_v02');
var HttpApi = vumigo.http.api.HttpApi;

// PROJECT SPECIFIC UTILS
go.utils_project = {


// IDENTITY HELPERS

    find_healthworker_with_personnel_code: function(im, personnel_code) {
        var params = {
            "details__personnel_code": personnel_code
        };
        return go.utils
            .get_paginated_response('identities', 'identities/search/', params, im)
            .then(function(json_get_response) {
                var healthworkers_found = json_get_response.results;
                // Return the first healthworker if found
                return healthworkers_found[0];
            });
    },

    find_corp_with_unique_code: function(im, code) {
        var params = {
            "details__corp_code": code
        };
        return go.utils
            .get_paginated_response('identities', 'identities/search/', params, im)
            .then(function(json_get_response) {
                var corps_found = json_get_response.results;
                // Return the first corp if found
                return corps_found[0];
            });
    },

    save_identities: function(im, msg_receiver, receiver_msisdn, household_msisdn,
                              mother_msisdn, operator_id) {
      // Creates identities for the msisdns entered in various states
      // and sets the identitity id's to user.answers for later use
      // msg_receiver: (str) person who will receive messages eg. 'mother_only'
      // *_msisdn: (str) msisdns of role players
      // operator_id: (str - uuid) id of healthworker making the registration

        if (msg_receiver === 'mother_only') {
            return go.utils
                // get or create mother's identity
                .get_or_create_identity({'msisdn': receiver_msisdn}, im, operator_id)
                .then(function(mother) {
                    im.user.set_answer('mother_id', mother.id);
                    im.user.set_answer('receiver_id', mother.id);
                    return;
                });
        } else if (['friend_only', 'family_only', 'father_only'].indexOf(msg_receiver) !== -1) {
            return go.utils
                // get or create msg_receiver's identity
                .get_or_create_identity({'msisdn': receiver_msisdn}, im, operator_id)
                .then(function(msg_receiver) {
                    im.user.set_answer('receiver_id', msg_receiver.id);
                    return go.utils
                        // create mother's identity - cannot get as no identifying information
                        .create_identity(im, null, msg_receiver.id, operator_id)
                        .then(function(mother) {
                            im.user.set_answer('mother_id', mother.id);
                            return;
                        });
                });
        } else if (['mother_friend', 'mother_family', 'mother_father'].indexOf(msg_receiver) !== -1) {
            return Q
                .all([
                    // create father's identity
                    go.utils.get_or_create_identity({'msisdn': household_msisdn}, im, operator_id),
                    // create mother's identity
                    go.utils.get_or_create_identity({'msisdn': mother_msisdn}, im, operator_id),
                ])
                .spread(function(father, mother) {
                    im.user.set_answer('receiver_id', father.id);
                    im.user.set_answer('mother_id', mother.id);
                    return;
                });
        }
    },

    update_identities: function(im, optin) {
      // Saves useful data collected during registration to the relevant identities
        var msg_receiver = im.user.answers.state_msg_receiver;
        if (msg_receiver === 'mother_only') {
            return go.utils
                .get_identity(im.user.answers.mother_id, im)
                .then(function(mother_identity) {
                    mother_identity.details.receiver_role = 'mother';
                    mother_identity.details.linked_to = null;
                    mother_identity.details.gravida = im.user.answers.state_gravida;
                    mother_identity.details.preferred_language = im.user.answers.state_msg_language;
                    mother_identity.details.preferred_msg_type = im.user.answers.state_msg_type;

                    if (im.user.answers.state_msg_type === 'audio') {
                        mother_identity.details.preferred_msg_days = im.user.answers.state_voice_days;
                        mother_identity.details.preferred_msg_times = im.user.answers.state_voice_times;
                    }

                    return go.utils.update_identity(im, mother_identity, optin);
                });
        } else if (['friend_only', 'family_only', 'father_only'].indexOf(msg_receiver) !== -1) {
            return Q
                .all([
                    go.utils.get_identity(im.user.answers.mother_id, im),
                    go.utils.get_identity(im.user.answers.receiver_id, im)
                ])
                .spread(function(mother_identity, receiver_identity) {
                    mother_identity.details.receiver_role = 'mother';
                    mother_identity.details.linked_to = im.user.answers.receiver_id;
                    mother_identity.details.gravida = im.user.answers.state_gravida;
                    mother_identity.details.preferred_language = im.user.answers.state_msg_language;

                    receiver_identity.details.receiver_role = msg_receiver.replace('_only', '');
                    receiver_identity.details.linked_to = im.user.answers.mother_id;
                    receiver_identity.details.preferred_msg_type = im.user.answers.state_msg_type;
                    receiver_identity.details.preferred_language = im.user.answers.state_msg_language;

                    if (im.user.answers.state_msg_type === 'audio') {
                        receiver_identity.details.preferred_msg_days = im.user.answers.state_voice_days;
                        receiver_identity.details.preferred_msg_times = im.user.answers.state_voice_times;
                    }

                    return Q.all([
                        go.utils.update_identity(im, mother_identity, optin),
                        go.utils.update_identity(im, receiver_identity, optin)
                    ]);
                });
        } else if (['mother_friend', 'mother_family', 'mother_father'].indexOf(msg_receiver) !== -1) {
            return Q
                .all([
                    go.utils.get_identity(im.user.answers.mother_id, im),
                    go.utils.get_identity(im.user.answers.receiver_id, im)
                ])
                .spread(function(mother_identity, receiver_identity) {
                    mother_identity.details.receiver_role = 'mother';
                    mother_identity.details.linked_to = im.user.answers.receiver_id;
                    mother_identity.details.preferred_msg_type = im.user.answers.state_msg_type;
                    mother_identity.details.gravida = im.user.answers.state_gravida;
                    mother_identity.details.preferred_language = im.user.answers.state_msg_language;

                    receiver_identity.details.receiver_role = msg_receiver.replace('mother_', '');
                    receiver_identity.details.linked_to = im.user.answers.mother_id;
                    receiver_identity.details.household_msgs_only = true;
                    receiver_identity.details.preferred_msg_type = im.user.answers.state_msg_type;
                    receiver_identity.details.preferred_language = im.user.answers.state_msg_language;

                    if (im.user.answers.state_msg_type === 'audio') {
                        mother_identity.details.preferred_msg_days = im.user.answers.state_voice_days;
                        mother_identity.details.preferred_msg_times = im.user.answers.state_voice_times;
                        receiver_identity.details.preferred_msg_days = im.user.answers.state_voice_days;
                        receiver_identity.details.preferred_msg_times = im.user.answers.state_voice_times;
                    }

                    return Q.all([
                        go.utils.update_identity(im, mother_identity, optin),
                        go.utils.update_identity(im, receiver_identity, optin)
                    ]);
                });
        }
    },


// DATE HELPERS

    is_valid_month: function(today, choiceYear, choiceMonth, monthsValid) {
        // function used to validate months for states 5A/5B & 12A/12B

        // NOTE: make sure we cast numbers to strings instead
        //       of adding up numbers
        var choiceDate = new moment('' + choiceYear + choiceMonth, "YYYYMM");
        var startDate = today.clone();
        // note: 1 is subtracted as current month is already included
        startDate = startDate.subtract('month', monthsValid - 1);
        startDate.date(1);  // set day of month to 1st

        // choice >= startDate && <= today/endDate
        if ((choiceDate.isSame(startDate) || choiceDate.isAfter(startDate)) &&
            (choiceDate.isSame(today) || choiceDate.isBefore(today))) {
            return true;
        } else {
            return false;
        }
    },

    get_year_value: function(today, year_choice) {
        return year_choice === 'this_year'
            ? today.year()
            : today.year() - 1;
    },

    get_baby_dob: function(im, day) {
        var date_today = go.utils.get_today(im.config);

        var year_text = im.user.answers.state_baby_birth_year;
        var year;
        switch (year_text) {
            case 'last_year':
            year = date_today.year() - 1;
            break;
            case 'this_year':
            year = date_today.year();
            break;
            case 'next_year':
            year = date_today.year() + 1;
            break;
        }

        var month = im.user.answers.state_12A_baby_birth_month ||
        im.user.answers.state_12B_baby_birth_month;
        var date_string = [
            year.toString(),
            go.utils.double_digit_number(month),
            go.utils.double_digit_number(day)
        ].join('-');

        if (go.utils.is_valid_date(date_string, 'YYYY-MM-DD')) {
            return date_string;
        } else {
            return 'invalid date';
        }
    },

    get_weeks_until_today: function(config, date, format) {
        return (
            parseInt(
                moment.duration(
                    go.utils.get_today(config) - moment(date, format)
                ).asWeeks()
            )
        );
    },


// GENERAL HELPERS

    should_restart: function(im) {
        var no_restart_states = [
            // voice registration states
            'state_personnel_auth',
            'state_corp_auth',
            // voice change states
            'state_msg_receiver_msisdn',
            'state_main_menu',
            'state_main_menu_household'
        ];

        return im.msg.content === '0'
            && im.user.state.name
            && no_restart_states.indexOf(im.user.state.name) === -1;
    },

    should_repeat: function(im) {
        return im.msg.content === '*';
    },


// VOICE HELPERS

    make_default_speech_url: function (im, lang) {
        return im.config.services.voice_content.url + lang + '/voice_file_not_found.mp3';
    },

    // Construct url string
    make_speech_url: function(im, name, lang, num, retry) {
        var url_array = [];

        var url_start = im.config.services.voice_content.url + lang + '/' + name + '_' + num;
        var extension = '.mp3';

        if (retry) {
            var error_url = go.utils_project.get_voice_error_url(im, name, lang);
            url_array.push(error_url);
        }

        url_array.push(url_start + extension);

        return url_array;
    },

    // Construct helper_data object
    make_voice_helper_data: function(im, name, lang, num, retry) {
        var voice_url = go.utils_project.make_speech_url(im, name, lang, num, retry);
        var bargeInDisallowedStates = [
            // voice registration states
            'state_end_msisdn',
            'state_end_sms',
            'state_end_voice',
            'state_end_sms_corp',
            'state_end_voice_corp',
            // voice public states
            'state_end_voice_confirm',
            'state_end_sms_confirm',
            'state_end_new_msisdn',
            'state_end_baby',
            'state_end_exit',
            'state_end_msg_language_confirm',
            'state_end_loss_subscription_confirm',
            'state_end_loss',
            'state_end_optout'
        ];

        var voice_url_check = voice_url.length === 1
            // if length is 1, check the only url in array
            ? voice_url[0]
            // else in error case, length > 1, check second url in array
            : voice_url[1];

        return im
            .log([
                'Voice URL is: ' + voice_url_check,
                'Constructed from:',
                '   Name: ' + name,
                '   Lang: ' + lang,
                '   Num: ' + num,
                '   Retry: ' + retry,
                ].join('\n'))
            .then(function () {
                var http = new HttpApi(im, {
                    headers: {
                        'Connection': ['close']
                    }
                });

                return http
                    .head(voice_url_check)
                    .then(function (response) {
                        return {
                            voice: {
                                speech_url: voice_url,
                                wait_for: '#',
                                barge_in: bargeInDisallowedStates.indexOf(name) !== -1 ? false : true
                            }
                        };
                    }, function (error) {
                        return im
                            .log('Unable to find voice file: ' + voice_url_check + '. Error: ' + error)
                            .then(function () {
                                return {
                                    voice: {
                                        speech_url: go.utils_project.make_default_speech_url(im, lang)
                                    }
                                };
                            });
                    });
            });
    },

    get_voice_error_url: function(im, name, lang) {
        var states_to_error_map = {
            // ussd states
            "state_personnel_auth": "state_error_invalid_number",
            "state_corp_auth": "state_error_invalid_number",
            "state_msg_receiver": "state_error_invalid_selection",
            "state_msisdn": "state_error_invalid_number",
            "state_msisdn_mother": "state_error_invalid_number",
            "state_msisdn_household": "state_error_invalid_number",
            "state_msisdn_already_registered": "state_error_invalid_selection",
            "state_pregnancy_status": "state_error_invalid_selection",
            "state_last_period_year": "state_error_invalid_date",
            "state_last_period_month": "state_error_invalid_date",
            "state_last_period_day": "state_error_invalid_date",
            "state_gravida": "state_error_invalid_number",
            "state_msg_type": "state_error_invalid_selection",
            // ussd/voice states
            "state_voice_days": "state_error_invalid_selection",
            "state_voice_times": "state_error_invalid_selection",
            "state_msg_language": "state_error_invalid_selection",
            // voice states
            "state_main_menu": "state_error_invalid_selection",
            "state_main_menu_household": "state_error_invalid_selection",
            "state_msg_receiver_msisdn": "state_error_invalid_number",
            "state_msisdn_not_recognised": "state_error_invalid_selection",
            "state_change_menu_sms": "state_error_invalid_selection",
            "state_change_menu_voice": "state_error_invalid_selection",
            "state_new_msisdn": "state_error_invalid_number",
            "state_number_in_use": "state_error_invalid_selection",
            "state_optout_reason": "state_error_invalid_selection",
            "state_loss_subscription": "state_error_invalid_selection",
            "state_optout_receiver": "state_error_invalid_selection"
        };

        var error_url = im.config.services.voice_content.url + lang + '/' + states_to_error_map[name] + '.mp3';

        return error_url;
    },


// SPEECH OPTION HELPERS

    get_speech_option_household: function(member) {
        member_map = {
            'father': '1',
            'family member': '2',
            'friend': '3'
        };
        return member_map[member];
    },

    get_speech_option_only: function(role) {
        role_map = {
            'mother_only': '1',
            'family_only': '2',
            'friend_only': '3',
            'father_only': '4'
        };
        return role_map[role];
    },

    get_speech_option_days: function(days) {
        day_map = {
            'mon_wed': '1',
            'tue_thu': '2'
        };
        return day_map[days];
    },

    get_speech_option_year: function(year) {
        return year === 'this_year' ? '1' : '2';
    },

    get_speech_option_days_time: function(days, time) {
        day_time_map = {
            'mon_wed_9_11': '1',
            'tue_thu_9_11': '2',
            'mon_wed_2_5': '3',
            'tue_thu_2_5': '4',
            'mon_wed_6_8': '5',
            'tue_thu_6_8': '6',
        };

        return day_time_map[days + '_' + time];
    },


// REGISTRATION HELPERS

    compile_reg_info: function(im) {
        var reg_info = {
            stage: im.user.answers.state_pregnancy_status,
            mother_id: im.user.answers.mother_id,
            data: {
                msg_receiver: im.user.answers.state_msg_receiver,
                receiver_id: im.user.answers.receiver_id,
                operator_id: im.user.answers.operator_id,
                gravida: im.user.answers.state_gravida,
                language: im.user.answers.state_msg_language,
                msg_type: im.user.answers.state_msg_type
            }
        };

        if (im.user.answers.user_id) {
            reg_info.data.user_id = im.user.answers.user_id;
        }

        // add data for voice time and day if applicable
        if (im.user.answers.state_msg_type === 'audio') {
            reg_info.data.voice_times = im.user.answers.state_voice_times;
            reg_info.data.voice_days = im.user.answers.state_voice_days;
        }

        // add data for last_period_date or baby_dob
        if (im.user.answers.state_pregnancy_status === 'prebirth') {
            reg_info.data.last_period_date = im.user.answers.working_date;
        } else if (im.user.answers.state_pregnancy_status === 'postbirth') {
            reg_info.data.baby_dob = im.user.answers.working_date;
        }

        return reg_info;
    },

    finish_registration: function(im) {
        var reg_info = go.utils_project.compile_reg_info(im);
        return Q.all([
            go.utils.create_registration(im, reg_info),
            go.utils_project.update_identities(im, true)
        ]);
    },

    update_mama_details: function(im, mama_identity, chew_phone_used) {
        if (im.user.answers.state_r04_mom_state === 'baby') {
            mama_identity.details.baby_dob = im.user.answers.birth_date;
            mama_identity.details.mama_edd = 'registration_after_baby_born';
        } else {
            mama_identity.details.baby_dob = 'mama_is_pregnant';
            mama_identity.details.mama_edd = im.user.answers.birth_date;
        }
        mama_identity.details.opted_out = false;
        mama_identity.details.has_registered = true;
        mama_identity.details.registered_at = go.utils.get_today(im.config
        ).format('YYYY-MM-DD HH:mm:ss');
        mama_identity.details.msg_receiver = im.user.answers.state_r03_receiver;
        mama_identity.details.state_at_registration = im.user.answers.state_r04_mom_state;
        mama_identity.details.state_current = im.user.answers.state_r04_mom_state;
        mama_identity.details.gravida = im.user.answers.state_gravida;
        mama_identity.details.lang = go.utils_project.get_lang(im);
        mama_identity.details.msg_type = im.user.answers.state_r10_message_type;
        mama_identity.details.voice_days = im.user.answers.state_r11_voice_days || 'text';
        mama_identity.details.voice_times = im.user.answers.state_r12_voice_times || 'text';
        return mama_identity;
    },

    get_lang: function(im) {
        lang_map = {
            'english': 'eng_NG',
            'igbo': 'ibo_NG',
            'pidgin': 'pcm_NG'
        };
        return lang_map[im.user.answers.state_r09_language];
    },


// OPTOUT HELPERS

    optout_mother: function(im, request_source) {
        return go.utils.optout(
            im,
            im.user.answers.mother_id,
            im.user.answers.state_optout_reason,
            'msisdn',
            im.user.answers.mother_msisdn,
            request_source,
            im.config.testing_message_id ||
              im.msg.message_id,
            'stop'
        );
    },

    optout_household: function(im, request_source) {
        return go.utils.optout(
            im,
            im.user.answers.household_id,
            im.user.answers.state_optout_reason,
            'msisdn',
            im.user.answers.household_msisdn,
            request_source,
            im.config.testing_message_id || im.msg.message_id,
            'stop'
        );
    },


// CHANGE HELPERS

    update_msg_format_time: function(im, new_msg_format, voice_days, voice_times) {
      // Sends new message type, preferred day and time to Change endpoint
      // and updates the mother's preferred msg settings

        var change_data = {
            "mother_id": im.user.answers.mother_id,
            "action": "change_messaging",
            "data": {
                "msg_type": new_msg_format,
                "voice_days": voice_days || null,
                "voice_times": voice_times || null
            }
        };

        return go.utils
            .service_api_call("registrations", "post", null, change_data, "change/", im)
            .then(function() {
                return go.utils
                    .get_identity(im.user.answers.mother_id, im)
                    .then(function(mother_identity) {
                        // Update mother only as household messages are text only for now
                        mother_identity.details.preferred_msg_type = new_msg_format;
                        mother_identity.details.preferred_msg_days = voice_days || null;
                        mother_identity.details.preferred_msg_times = voice_times || null;
                        return go.utils
                            .update_identity(im, mother_identity);
                    });
            });
    },

    switch_to_loss: function(im, mother_id, reason) {
      // Sends an Api request to the registration store to switch the mother
      // to loss messages

        var change_data = {
            "mother_id": mother_id,
            "action": "change_loss",
            "data": {
                "reason": reason
            }
        };

        return go.utils
            .service_api_call("registrations", "post", null, change_data, "change/", im)
            .then(function(response) {
                return response;
            });
    },

    switch_to_baby: function(im, mother_id) {
      // Sends an Api request to the registration store to switch the mother
      // to baby messages

        var change_data = {
            "mother_id": mother_id,
            "action": "change_baby",
            "data": {}
        };

        return go.utils
            .service_api_call("registrations", "post", null, change_data, "change/", im)
            .then(function(response) {
                return response;
            });
    },

    unsub_household: function(im, mother_id, household_id, reason) {
      // A unique change endpoint that unsubscribes only the household receiver
      // in an _only registration case; rather than doing an optout which would
      // block the mother's messages from getting through to the receiver

        var change_data = {
            "mother_id": mother_id,
            "action": "unsubscribe_household_only",
            "data": {
                "household_id": household_id,
                "reason": reason
            }
        };

        return go.utils
            .service_api_call("registrations", "post", null, change_data, "change/", im)
            .then(function(response) {
                return response;
            });
    },

    unsub_mother: function(im, mother_id, household_id, reason) {
      // A unique change endpoint that unsubscribes from the mother messages only
      // in an _only registration case; rather than doing an optout which would
      // block the household messages from getting through to the receiver

        var change_data = {
            "mother_id": mother_id,
            "action": "unsubscribe_mother_only",
            "data": {
                "household_id": household_id,
                "reason": reason
            }
        };

        return go.utils
            .service_api_call("registrations", "post", null, change_data, "change/", im)
            .then(function(response) {
                return response;
            });
    },

    change_language: function(im, new_lang, mother_id, household_id) {
      // Sends an Api request to the registration store to change the
      // subscriptions' languages, and sends a patch request to the identity
      // store to change the identities' languages

        var change_data = {
            "mother_id": mother_id,
            "action": "change_language",
            "data": {
                "new_language": new_lang,
                "household_id": household_id
            }
        };

        if (household_id === null) {
            return go.utils
                .get_identity(mother_id, im)
                .then(function(mother_identity) {
                    mother_identity.details.preferred_language = new_lang;
                    return Q
                        .all([
                            go.utils.update_identity(im, mother_identity),
                            go.utils.service_api_call("registrations", "post", null, change_data, "change/", im)
                        ]);
                });
        } else {
            return Q
                .all([
                    go.utils.get_identity(mother_id, im),
                    go.utils.get_identity(household_id, im)
                ])
                .spread(function(mother_identity, household_identity) {
                    mother_identity.details.preferred_language = new_lang;
                    household_identity.details.preferred_language = new_lang;
                    return Q
                        .all([
                            go.utils.update_identity(im, mother_identity),
                            go.utils.update_identity(im, household_identity),
                            go.utils.service_api_call("registrations", "post", null, change_data, "change/", im)
                        ]);
                });
        }
    },


// SMS HELPERS

    eval_dialback_reminder: function(e, im, user_id, $, sms_content) {
        var close_state = e.im.state.name;
        var non_dialback_sms_states = [
            'state_start',
            'state_auth_code',
            'state_end_voice',
            'state_end_sms'
        ];
        if (non_dialback_sms_states.indexOf(close_state) === -1
        && e.user_terminated) {
            return go.utils
            .get_identity(user_id, im)
            .then(function(user) {
                if (!user.details.dialback_sent) {
                    user.details.dialback_sent = true;
                    return Q.all([
                        go.utils_project.send_text(im, user_id, sms_content),
                        go.utils.update_identity(im, user)
                    ]);
                }
            });
        } else {
            return Q();
        }
    },

    send_text: function(im, user_id, sms_content) {
        var payload = {
            "identity": user_id,
            "content": sms_content.replace("{{channel}}", im.config.channel)
            // $ does not work well with fixtures here since it's an object
        };
        return go.utils
        .service_api_call("message_sender", "post", null, payload, 'outbound/', im)
        .then(function(json_post_response) {
            var outbound_response = json_post_response.data;
            // Return the outbound id
            return outbound_response.id;
        });
    },


// SUBSCRIPTION HELPERS

    get_subscription_messageset_through_identity: function(im, mother_id) {
      // Return the messageset that an identity is subscribed to

        // get subscription
        return go.utils
            .get_active_subscription_by_identity(im, mother_id)
            .then(function(subscription) {
                if (subscription === null) {
                    return 'no_active_subs_found';
                } else {
                    // get messageset
                    return go.utils
                        .get_messageset(im, subscription.messageset)
                        .then(function(messageset) {
                            return messageset;
                        });
                    }
            });
    },

    get_subscription_msg_type: function(im, mother_id) {
      // Look up what type of messages the mother is receiving

        return go.utils_project
            .get_subscription_messageset_through_identity(im, mother_id)
            .then(function(messageset) {
                return messageset.content_type;  // 'text' / 'audio'
            });
    },

    check_is_subscribed: function(im, identity, partial_name) {
      // Look up if the user is subscribed to a messageset containing partial_name
        return go.utils_project
            .get_subscription_messageset_through_identity(im, identity)
            .then(function(messageset) {
                if (messageset === 'no_active_subs_found') {
                    return 'no_active_subs_found';
                } else {
                    if (messageset.short_name.indexOf(partial_name) == -1) {
                        return false;
                    } else {
                        return true;
                    }
                }
            });
    },

    check_postbirth_subscription: function(im, mother_id) {
      // Look up if the mother is subscribed to postbirth messages
        return go.utils_project
            .check_is_subscribed(im, mother_id, 'postbirth')
            .then(function(result) {
                return result;
            });
    },

    update_subscription: function(im, subscription) {
        var endpoint = "subscriptions/" + subscription.id + '/';
        return go.utils
        .service_api_call("subscriptions", 'patch', {}, subscription, endpoint, im)
        .then(function(response) {
            return response.data.id;
        });
    },


    "commas": "commas"
};

go.app = function() {
    var vumigo = require('vumigo_v02');
    var SeedJsboxUtils = require('seed-jsbox-utils');
    var MetricsHelper = require('go-jsbox-metrics-helper');
    var App = vumigo.App;
    var Choice = vumigo.states.Choice;
    var ChoiceState = vumigo.states.ChoiceState;
    var EndState = vumigo.states.EndState;
    var FreeText = vumigo.states.FreeText;
    var JsonApi = vumigo.http.api.JsonApi;


    var GoApp = App.extend(function(self) {
        App.call(self, 'state_start');
        var $ = self.$;
        var interrupt = true;

        self.init = function() {
            // Send a dial back reminder via sms the first time someone times out
            self.im.on('session:close', function(e) {
                return go.utils_project.eval_dialback_reminder(
                    e, self.im, self.im.user.answers.user_id, $,
                    "Please dial back into {{channel}} to complete the Hello MAMA registration"
                    );
            });

            self.env = self.im.config.env;
            self.metric_prefix = [self.env, self.im.config.name].join('.').replace(/-/g, '_');
            self.store_name = [self.env, self.im.config.name].join('.');

            mh = new MetricsHelper(self.im);
            mh
                .add.total_state_actions(
                    {
                        state: 'state_msg_receiver',
                        action: 'enter'
                    },[self.metric_prefix, "registrations_started"].join('.')
                )
                .add.total_state_actions(
                    {
                        state: 'state_end_voice',
                        action: 'enter'
                    },[self.metric_prefix, "registrations_completed"].join('.')
                )
                .add.total_state_actions(
                    {
                        state: 'state_end_sms',
                        action: 'enter'
                    },[self.metric_prefix, "registrations_completed"].join('.')
                )
            ;

            // Average sessions to register - manual instead of helper because of two end states
            var avg_label = [self.metric_prefix, 'avg.sessions_to_register'].join('.');
            var avg_metadata_label = 'sessions_until_state_metric_' + avg_label;
            var avg_states = ['state_end_voice', 'state_end_sms'];
            self.im.on('session:new', function(e) {
                /* Increment sessions counter */
                mh._increment_metadata(e.im.user, avg_metadata_label);
            });

            self.im.on('state:enter', function(e) {
                /* Reset sessions counter and fire metric */
                if(avg_states.indexOf(e.state.name) != -1) {
                    var metadata_value = mh._reset_metadata(
                        e.state.im.user, avg_metadata_label);
                    return e.state.im.metrics.fire.avg(avg_label, metadata_value);
                }
            });

            sbm = new SeedJsboxUtils.StageBasedMessaging(
                new JsonApi(self.im, {}),
                self.im.config.services.subscriptions.api_token,
                self.im.config.services.subscriptions.url
            );

        };

    // TEXT CONTENT

        var get_content = function(state_name) {
            switch (state_name) {
                case "state_timed_out":
                    return $("You have an incomplete registration. Would you like to continue with this registration?");
                case "state_auth_code":
                    return $("{{prefix}}Please enter your unique Community Resource Persons code.");
                case "state_msg_receiver":
                    return $("{{prefix}}Who will receive the messages on their phone?");
                case "state_msisdn":
                    return $("{{prefix}}Please enter the mobile number of the {{roleplayer}}. They must consent to receiving messages.");
                case "state_msisdn_already_registered":
                    return $("{{prefix}}Sorry, this number is already registered for messages. They must opt-out before continuing.");
                case "state_msisdn_mother":
                    return $("{{prefix}}Please enter the mobile number of the mother. They must consent to receiving messages.");
                case "state_msisdn_household":
                    return $("{{prefix}}Please enter the mobile number of the {{roleplayer}}. They must consent to receiving messages.");
                case "state_msg_language":
                    return $("{{prefix}}What language would they like to receive the messages in?");
                case "state_msg_type":
                    return $("{{prefix}}How would they like to receive the messages?");
                case "state_end_voice":
                    return $("Thank you. The person will now start receiving calls on Tuesday between 6pm and 8pm for 4 weeks.");
                case "state_end_sms":
                    return $("Thank you. The person will now start receiving messages once per week for 4 weeks.");
                case "state_end_msisdn":
                    return $("Thank you for using the Hello Mama service.");
            }
        };

        var state_error_types = {
            "invalid_date": $("Sorry, invalid date. "),
            "invalid_selection": $("Sorry, invalid option. "),
            "invalid_number": $("Sorry, invalid number. ")
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
                return self.states.create('state_timed_out', opts);
            });
        };

        // timeout 01
        self.states.add('state_timed_out', function(name, creator_opts) {
            return new ChoiceState(name, {
                question: get_content(name),
                choices: [
                    new Choice('continue', $("Yes")),
                    new Choice('restart', $("No, start a new registration"))
                ],
                next: function(choice) {
                    if (choice.value === 'continue') {
                        return {
                            name: creator_opts.name,
                            creator_opts: creator_opts
                        };
                    } else if (choice.value === 'restart') {
                        return 'state_start';
                    }
                }
            });
        });


        // START STATE

        self.add('state_start', function(name) {
            self.im.user.answers = {};  // reset answers
            return go.utils
                .get_or_create_identity({'msisdn': self.im.user.addr}, self.im, null)
                .then(function(user) {
                    self.im.user.set_answer('user_id', user.id);
                    if (user.details.corp_code) {
                        self.im.user.set_answer('operator_id', user.id);
                        return self.states.create('state_msg_receiver');
                    } else {
                        return self.states.create('state_auth_code');
                    }
                });
        });


        // REGISTRATION STATES
        self.add('state_auth_code', function(name) {
            return new FreeText(name, {
                question: get_content(name).context({prefix: "Welcome to Hello MAMA! "}),
                check: function(content) {
                    var unique_code = content;
                    return go.utils_project
                        .find_corp_with_unique_code(self.im, unique_code)
                        .then(function(corp) {
                            if (corp) {
                                self.im.user.set_answer('operator_id', corp.id);
                                return null;  // vumi expects null or undefined if check passes
                            } else {
                                return get_content(name)
                                    .context({prefix: state_error_types.invalid_number});
                            }
                        });
                },
                next: 'state_msg_receiver'
            });
        });

        self.add('state_msg_receiver', function(name) {
            return new ChoiceState(name, {
                question: get_content(name).context({prefix:"Welcome to Hello Mama. "}),
                error: get_content(name).context({prefix: state_error_types.invalid_selection}),
                choices: [
                    new Choice('mother_father', $("Mother, Father")),
                    new Choice('mother_only', $("Mother")),
                    new Choice('father_only', $("Father")),
                    new Choice('mother_family', $("Mother, family member")),
                    new Choice('mother_friend', $("Mother, friend")),
                    new Choice('friend_only', $("Friend")),
                    new Choice('family_only', $("Family member"))
                ],
                next: function(choice) {
                    var seperate = ["mother_father", "mother_family", "mother_friend"];
                    if (seperate.indexOf(choice.value) == -1) {
                        // Only one receiver
                        return 'state_msisdn';
                    } else {
                        // Mother and another receiver
                        return 'state_msisdn_mother';
                    }
                }
            });
        });

        self.add('state_msisdn', function(name) {
            return new FreeText(name, {
                question: get_content(name).context({
                    prefix: "",
                    roleplayer: self.im.user.answers.state_msg_receiver
                        // change the state_msg_receiver answer to display correctly
                        // in the ussd text
                        .replace('mother_only', 'mother')
                        .replace('father_only', 'father')
                        .replace('friend_only', 'friend')
                        .replace('family_only', 'family member')
                }),
                check: function(content) {
                    if (go.utils.is_valid_msisdn(content)) {
                        return null;  // vumi expects null or undefined if check passes
                    } else {
                        return get_content(name).context({
                            prefix: state_error_types.invalid_number,
                            roleplayer: self.im.user.answers.state_msg_receiver
                                // change the state_msg_receiver answer to display correctly
                                // in the ussd text
                                .replace('mother_only', 'mother')
                                .replace('father_only', 'father')
                                .replace('friend_only', 'friend')
                                .replace('family_only', 'family member')
                        });
                    }
                },
                next: function(content) {
                    var msisdn = go.utils.normalize_msisdn(
                        content, self.im.config.country_code);
                    return go.utils
                        .get_identity_by_address({'msisdn': msisdn}, self.im)
                        .then(function(contact) {
                            if (contact === undefined || contact === null ||
                                    self.im.user.answers.state_msg_receiver != 'mother_only') {
                                return 'state_save_identities';
                            }

                            return sbm
                                .is_identity_subscribed(
                                    contact.id, [/public\.mother/, /prebirth\.mother/, /postbirth\.mother/])
                                .then(function(subscribed) {
                                    if (!subscribed) {
                                        self.im.user.set_answer('mother_id', contact.id);
                                        self.im.user.set_answer('receiver_id', contact.id);
                                        return self.states.create('state_msg_language');
                                    } else {
                                        self.im.user.set_answer('role_player', contact.details.receiver_role);
                                        self.im.user.set_answer('contact_id', contact.id);
                                        return 'state_msisdn_already_registered';
                                    }
                                });
                        });
                }
            });
        });

        self.add('state_msisdn_already_registered', function(name) {
            return new ChoiceState(name, {
                question: get_content(name).context({prefix:""}),
                error: get_content(name)
                    .context({prefix: state_error_types.invalid_selection}),
                choices: [
                    new Choice('msisdn', $("Try a different number")),
                    new Choice('state_msg_receiver', $("Choose a different receiver")),
                    new Choice('exit', $("Exit"))
                ],
                next: function(choice) {
                    if (choice.value == 'msisdn') {
                      var seperate = ["mother_father", "mother_family", "mother_friend"];
                      if (seperate.indexOf(self.im.user.answers.state_msg_receiver) == -1) {
                          // Only one receiver
                          return 'state_msisdn';
                      } else {
                          // Mother and another receiver
                          return 'state_msisdn_mother';
                      }
                    } else if (choice.value == 'exit') {
                        return 'state_end_msisdn';
                    } else {
                        return choice.value;
                    }
                }
            });
        });

        self.add('state_end_msisdn', function(name) {
            return new EndState(name, {
                text: get_content(name),
                next: 'state_start'
            });
        });

        self.add('state_msisdn_mother', function(name) {
            return new FreeText(name, {
                question: get_content(name).context({prefix:""}),
                check: function(content) {
                    if (go.utils.is_valid_msisdn(content)) {
                        return null;  // vumi expects null or undefined if check passes
                    } else {
                        return get_content(name).context({prefix: state_error_types.invalid_number});
                    }
                },
                next: function(content) {
                    var msisdn = go.utils.normalize_msisdn(
                        content, self.im.config.country_code);
                    return go.utils
                        .get_identity_by_address({'msisdn': msisdn}, self.im)
                        .then(function(contact) {
                            if (contact === undefined || contact === null) {
                                return 'state_msisdn_household';
                            }
                            return sbm
                                .is_identity_subscribed(
                                    contact.id, [/public\.mother/, /prebirth\.mother/, /postbirth\.mother/])
                                .then(function(subscribed) {
                                    if (!subscribed || subscribed == 'no_active_subs_found') {
                                        return 'state_msisdn_household';
                                    } else {
                                        return 'state_msisdn_already_registered';
                                    }
                                });
                        });
                }
            });
        });

        self.add('state_msisdn_household', function(name) {
            return new FreeText(name, {
                question: get_content(name).context({
                    prefix: "",
                    roleplayer: self.im.user.answers.state_msg_receiver
                        // change the state_msg_receiver answer to display correctly
                        // in the ussd text
                        .replace('mother_family', 'family member')
                        .replace('mother_', '')
                }),
                check: function(content) {
                    if (go.utils.is_valid_msisdn(content)) {
                        return null;  // vumi expects null or undefined if check passes
                    } else {
                        return get_content(name).context({
                            prefix: state_error_types.invalid_number,
                            roleplayer: self.im.user.answers.state_msg_receiver
                                // change the state_msg_receiver answer to display correctly
                                // in the ussd text
                                .replace('mother_family', 'family member')
                                .replace('mother_', '')
                        });
                    }
                },
                next: function() {
                    var receiver_mapping = {
                        'mother_father': 'father_only',
                        'mother_friend': 'friend_only',
                        'mother_family': 'family_only'
                    };
                    if (self.im.user.answers.state_msisdn_household ===
                        self.im.user.answers.state_msisdn_mother) {
                        self.im.user.set_answer('state_msg_receiver',
                            receiver_mapping[self.im.user.answers.state_msg_receiver]);
                        self.im.user.set_answer('state_msisdn',
                                                self.im.user.answers.state_msisdn_mother);
                    }
                    return 'state_save_identities';
                }
            });
        });

        // Get or create identities and save their IDs
        self.add('state_save_identities', function(name) {
            return go.utils_project
                .save_identities(
                    self.im,
                    self.im.user.answers.state_msg_receiver,
                    self.im.user.answers.state_msisdn,
                    self.im.user.answers.state_msisdn_household,
                    self.im.user.answers.state_msisdn_mother,
                    self.im.user.answers.operator_id
                )
                .then(function() {
                    return self.states.create('state_msg_language');
                });
        });

        self.add('state_msg_language', function(name) {
            return new ChoiceState(name, {
                question: get_content(name).context({prefix:""}),
                error: get_content(name).context({prefix: state_error_types.invalid_selection}),
                choices: [
                    new Choice('eng_NG', $('English')),
                    new Choice('ibo_NG', $('Igbo')),
                    new Choice('pcm_NG', $('Pidgin'))
                ],
                next: 'state_msg_type'
            });
        });

        self.add('state_msg_type', function(name) {
            return new ChoiceState(name, {
                question: get_content(name).context({prefix:""}),
                error: get_content(name).context({prefix: state_error_types.invalid_selection}),
                choices: [
                    new Choice('audio', $('Voice calls')),
                    new Choice('text', $('Text SMSs'))
                ],
                next: function(choice) {
                    self.im.user.set_answer('state_pregnancy_status', 'public');
                    if (choice.value === 'audio') {
                        self.im.user.set_answer('state_voice_days', self.im.config.default_day);
                        self.im.user.set_answer('state_voice_times', self.im.config.default_time);

                        return go.utils_project
                            .finish_registration(self.im)
                            .then(function() {
                                return 'state_end_voice';
                            });
                    } else {
                        return go.utils_project
                            .finish_registration(self.im)
                            .then(function() {
                                return 'state_end_sms';
                            });
                    }
                }
            });
        });

        self.add('state_end_voice', function(name) {
            return new EndState(name, {
                text: get_content(name).context(),
                next: 'state_start'
            });
        });

        self.add('state_end_sms', function(name) {
            return new EndState(name, {
                text: get_content(name),
                next: 'state_start'
            });
        });

    });

    return {
        GoApp: GoApp
    };
}();

go.init = function() {
    var vumigo = require('vumigo_v02');
    var InteractionMachine = vumigo.InteractionMachine;
    var GoApp = go.app.GoApp;

    return {
        im: new InteractionMachine(api, new GoApp())
    };
}();
