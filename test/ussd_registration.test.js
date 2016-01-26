var vumigo = require('vumigo_v02');
var fixtures = require('./fixtures');
var AppTester = vumigo.AppTester;

describe("Mama Nigeria App", function() {
    describe("USSD Registration", function() {
        var app;
        var tester;

        beforeEach(function() {
            app = new go.app.GoApp();
            tester = new AppTester(app);

            tester
                .setup.char_limit(182)
                .setup.config.app({
                    name: 'ussd-registration-test',
                    channel: '*120*8864*0000#',
                    testing_today: '2015-04-03 06:07:08.999',
                    control: {
                        url: "http://localhost:8000/api/v1/",
                        api_key: "control_test_key"
                    },
                    endpoints: {
                        "sms": {"delivery_class": "sms"}
                    },
                    vumi_http: {
                        url: "https://localhost/api/v1/go/http_api_nostream/conversation_key/messages.json",
                        account_key: "acc_key",
                        conversation_token: "conv_token"
                    }
                })
                .setup(function(api) {
                    fixtures().forEach(api.http.fixtures.add);
                })
                .setup(function(api) {
                    // new user 082111
                    api.contacts.add({
                        msisdn: '+082111',
                        extra: {},
                        key: "contact_key_082111",
                        user_account: "contact_user_account"
                    });
                })
                .setup(function(api) {
                    // hcp recognised user 082222
                    api.contacts.add({
                        msisdn: '+082222',
                        extra: {},
                        key: "contact_key_082222",
                        user_account: "contact_user_account"
                    });
                })
                ;
        });

        // TEST TIMEOUTS

        describe("Timeout testing", function() {
            it("should ask about continuing", function() {
                return tester
                    .setup.user.addr('082111')
                    .inputs(
                        {session_event: 'new'}  // dial in
                        , '12345'  // state_auth_code - personnel code
                        , {session_event: 'close'}
                        , {session_event: 'new'}
                    )
                    .check.interaction({
                        state: 'state_timed_out',
                        reply: [
                            "You have an incomplete registration. Would you like to continue with this registration?",
                            "1. Yes",
                            "2. Start new registration"
                        ].join('\n')
                    })
                    .run();
            });
            it("should continue", function() {
                return tester
                    .setup.user.addr('082111')
                    .inputs(
                        {session_event: 'new'}  // dial in
                        , '12345'  // state_auth_code - personnel code
                        , {session_event: 'close'}
                        , {session_event: 'new'}
                        , '1'  // state_timed_out - continue
                    )
                    .check.interaction({
                        state: 'state_msisdn'
                    })
                    .run();
            });
            it("should restart", function() {
                return tester
                    .setup.user.addr('082111')
                    .inputs(
                        {session_event: 'new'}  // dial in
                        , '12345'  // state_auth_code - personnel code
                        , {session_event: 'close'}
                        , {session_event: 'new'}
                        , '2'  // state_timed_out - restart
                    )
                    .check.interaction({
                        state: 'state_auth_code'
                    })
                    .run();
            });
        });

        // TEST HCP RECOGNISED USER

        describe("HCP recognised user", function() {
            it("should not be asked for personnel code", function() {
                return tester
                    .setup.user.addr('082222')
                    .inputs(
                        {session_event: 'new'}  // dial in
                    )
                    .check.interaction({
                        state: 'state_msisdn'
                    })
                    .run();
            });
        });

        // TEST REGISTRATION

        describe("Flow testing - registration", function() {
            it("to state_auth_code", function() {
                return tester
                    .setup.user.addr('082111')
                    .inputs(
                        {session_event: 'new'}  // dial in
                    )
                    .check.interaction({
                        state: 'state_auth_code',
                        reply: "Welcome to Hello Mama! Please enter your unique personnel code. For example, 12345"
                    })
                    .run();
            });
            it("to state_msisdn", function() {
                return tester
                    .setup.user.addr('082111')
                    .inputs(
                        {session_event: 'new'}  // dial in
                        , '12345'  // state_auth_code - personnel code
                    )
                    .check.interaction({
                        state: 'state_msisdn',
                        reply: "Please enter the mobile number of the person who will receive the weekly messages. For example, 08033046899"
                    })
                    .run();
            });
            it("to state_msg_receiver", function() {
                return tester
                    .setup.user.addr('082111')
                    .inputs(
                        {session_event: 'new'}  // dial in
                        , '12345'  // state_auth_code - personnel code
                        , '0803304899' // state_msisdn - mobile number
                    )
                    .check.interaction({
                        state: 'state_msg_receiver',
                        reply: [
                            "Please select who will receive the messages on their phone:",
                            "1. The Mother",
                            "2. The Father",
                            "3. Family member",
                            "4. Trusted friend"
                        ].join('\n')
                    })
                    .run();
            });
            it("to state_pregnancy_status", function() {
                return tester
                    .setup.user.addr('082111')
                    .inputs(
                        {session_event: 'new'}  // dial in
                        , '12345'   // state_auth_code - personnel code
                        , '0803304899' // state_msisdn - mobile number
                        , '1'  // state_msg_receiver - mother
                    )
                    .check.interaction({
                        state: 'state_pregnancy_status',
                        reply: [
                            "Please select one of the following:",
                            "1. The mother is pregnant",
                            "2. The mother has a baby under 1 year old"
                        ].join('\n')
                    })
                    .run();
            });

            // mother is pregnant
            it("to state_last_period_month", function() {
                return tester
                    .setup.user.addr('082111')
                    .inputs(
                        {session_event: 'new'}  // dial in
                        , '12345'   // state_auth_code - personnel code
                        , '0803304899' // state_msisdn - mobile number
                        , '1'  // state_msg_receiver - mother
                        , '1'  // state_msg_pregnancy_status - pregnant
                    )
                    .check.interaction({
                        state: 'state_last_period_month',
                        reply: [
                            "Please select the month the woman had her last period:",
                            "1. April 16",
                            "2. March 16",
                            "3. February 16",
                            "4. January 16",
                            "5. December 15",
                            "6. November 15",
                            "7. October 15",
                            "8. September 15",
                            "9. More"
                        ].join('\n')
                    })
                    .run();
            });
            it("to state_last_period_day", function() {
                return tester
                    .setup.user.addr('082111')
                    .inputs(
                        {session_event: 'new'}  // dial in
                        , '12345'   // state_auth_code - personnel code
                        , '0803304899' // state_msisdn - mobile number
                        , '1'  // state_msg_receiver - mother
                        , '1'  // state_msg_pregnant - mother
                        , '3'  // state_last_period_month - May 15
                    )
                    .check.interaction({
                        state: 'state_last_period_day',
                        reply: "What day of the month did the woman start her last period? For example, 12."
                    })
                    .run();
            });
            it("to state_msg_language", function() {
                return tester
                    .setup.user.addr('082111')
                    .inputs(
                      {session_event: 'new'}  // dial in
                      , '12345'   // state_auth_code - personnel code
                      , '0803304899' // state_msisdn - mobile number
                      , '1'  // state_msg_receiver - mother
                      , '1'  // state_msg_pregnant - mother
                      , '3'  // state_last_period_month - May 15
                      , '12'  // state_last_period_day
                    )
                    .check.interaction({
                        state: 'state_msg_language',
                        reply: [
                            "Which language would this person like to receive these messages in?",
                            "1. English",
                            "2. Hausa",
                            "3. Igbo"
                        ].join('\n')
                    })
                    .run();
            });
            // mother has baby
            it("to state_baby_birth_month_year", function() {
                return tester
                    .setup.user.addr('082111')
                    .inputs(
                        {session_event: 'new'}  // dial in
                        , '12345'   // state_auth_code - personnel code
                        , '0803304899' // state_msisdn - mobile number
                        , '1'  // state_msg_receiver - mother
                        , '2'  // state_msg_pregnancy_status - baby
                    )
                    .check.interaction({
                        state: 'state_baby_birth_month_year',
                        reply: [
                            "Select the month & year the baby was born:",
                            "1. April 16",
                            "2. March 16",
                            "3. February 16",
                            "4. January 16",
                            "5. December 15",
                            "6. November 15",
                            "7. October 15",
                            "8. September 15",
                            "9. More"
                        ].join('\n')
                    })
                    .run();
            });
            it("to state_baby_birth_day", function() {
                return tester
                    .setup.user.addr('082111')
                    .inputs(
                        {session_event: 'new'}  // dial in
                        , '12345'   // state_auth_code - personnel code
                        , '0803304899' // state_msisdn - mobile number
                        , '1'  // state_msg_receiver - mother
                        , '2'  // state_msg_pregnancy_status - baby
                        , '3'  // state_baby_birth_month_year - May 15
                    )
                    .check.interaction({
                        state: 'state_baby_birth_day',
                        reply: "What day of the month was the baby born? For example, 12."
                    })
                    .run();
            });
            it("to state_msg_language", function() {
                return tester
                    .setup.user.addr('082111')
                    .inputs(
                      {session_event: 'new'}  // dial in
                      , '12345'   // state_auth_code - personnel code
                      , '0803304899' // state_msisdn - mobile number
                      , '1'  // state_msg_receiver - mother
                      , '2'  // state_msg_pregnancy_status - baby
                      , '3'  // state_baby_birth_month_year - May 15
                      , '12'  // state_baby_birth_day
                    )
                    .check.interaction({
                        state: 'state_msg_language',
                    })
                    .run();
            });

            it("to state_msg_type", function() {
                return tester
                    .setup.user.addr('082111')
                    .inputs(
                        {session_event: 'new'}  // dial in
                        , '12345'   // state_auth_code - personnel code
                        , '0803304899' // state_msisdn - mobile number
                        , '1'  // state_msg_receiver - mother
                        , '1'  // state_msg_pregnant - mother
                        , '3'  // state_last_period_month - May 15
                        , '12' // state_last_period_day - 12
                        , '1'  // state_msg_language - english
                    )
                    .check.interaction({
                        state: 'state_msg_type',
                        reply: [
                            "How would this person like to get messages?",
                            "1. Voice calls",
                            "2. Text SMSs"
                        ].join('\n')
                    })
                    .run();
            });

            // user wants voice calls
            it("to state_voice_days", function() {
                return tester
                    .setup.user.addr('082111')
                    .inputs(
                        {session_event: 'new'}  // dial in
                        , '12345'   // state_auth_code - personnel code
                        , '0803304899' // state_msisdn - mobile number
                        , '1'  // state_msg_receiver - mother
                        , '1'  // state_msg_pregnant - mother
                        , '3'  // state_last_period_month - May 15
                        , '12' // state_last_period_day - 12
                        , '1'  // state_msg_language - english
                        , '1'   // state_msg_type - voice calls
                    )
                    .check.interaction({
                        state: 'state_voice_days',
                        reply: [
                            "We will call them twice a week. On what days would the person like to receive these calls?",
                            "1. Monday and Wednesday",
                            "2. Tuesday and Thursday"
                        ].join('\n')
                    })
                    .run();
            });
            it("to state_voice_times", function() {
                return tester
                    .setup.user.addr('082111')
                    .inputs(
                        {session_event: 'new'}  // dial in
                        , '12345'   // state_auth_code - personnel code
                        , '0803304899' // state_msisdn - mobile number
                        , '1'  // state_msg_receiver - mother
                        , '1'  // state_msg_pregnant - mother
                        , '3'  // state_last_period_month - May 15
                        , '12' // state_last_period_day - 12
                        , '1'  // state_msg_language - english
                        , '1'   // state_msg_type - voice calls
                        , '2'   // state_voice_days - tuesdays and thursdays
                    )
                    .check.interaction({
                        state: 'state_voice_times',
                        reply: [
                            "Thank you. At what time would they like to receive these calls?",
                            "1. Between 9-11am",
                            "2. Between 2-5pm"
                        ].join('\n')
                    })
                    .run();
            });
            it("to state_end_voice", function() {
                return tester
                    .setup.user.addr('082111')
                    .inputs(
                        {session_event: 'new'}  // dial in
                        , '12345'   // state_auth_code - personnel code
                        , '0803304899' // state_msisdn - mobile number
                        , '1'  // state_msg_receiver - mother
                        , '1'  // state_msg_pregnant - mother
                        , '3'  // state_last_period_month - May 15
                        , '12' // state_last_period_day - 12
                        , '1'  // state_msg_language - english
                        , '1'   // state_msg_type - voice calls
                        , '2'   // state_voice_days - tuesdays and thursdays
                        , '2'   // state_voice_times - between 2-5pm
                    )
                    .check.interaction({
                        state: 'state_end_voice',
                        reply: "Thank you. The person will now start receiving calls on [day and day] between [time - time]."
                    })
                    .check.reply.ends_session()
                    .run();
            });
            //user wants text sms's
            it("to state_end_sms", function() {
                return tester
                    .setup.user.addr('082111')
                    .inputs(
                        {session_event: 'new'}  // dial in
                        , '12345'   // state_auth_code - personnel code
                        , '0803304899' // state_msisdn - mobile number
                        , '1'  // state_msg_receiver - mother
                        , '1'  // state_msg_pregnant - mother
                        , '3'  // state_last_period_month - May 15
                        , '12' // state_last_period_day - 12
                        , '2'  // state_msg_language - hausa
                        , '2'   // state_msg_type - text smss
                    )
                    .check.interaction({
                        state: 'state_end_sms',
                        reply: "Thank you. The person will now start receiving messages three times a week."
                    })
                    .check.reply.ends_session()
                    .run();
            });
        });

        describe("Flow testing - complete flows", function() {
            it("complete flow 1 - mother pregnant, voice", function() {
                return tester
                    .setup.user.addr('082111')
                    .inputs(
                        {session_event: 'new'}  // dial in
                        , '12345'   // state_auth_code - personnel code
                        , '0803304899' // state_msisdn - mobile number
                        , '1'  // state_msg_receiver - mother
                        , '1'  // state_msg_pregnant - mother
                        , '3'  // state_last_period_month - May 15
                        , '12' // state_last_period_day - 12
                        , '1'  // state_msg_language - english
                        , '1'   // state_msg_type - voice calls
                        , '2'   // state_voice_days - tuesdays and thursdays
                        , '2'   // state_voice_times - between 2-5pm
                    )
                    .check.interaction({
                        state: 'state_end_voice',
                    })
                    .run();
            });
            it("complete flow 2 - mother baby, sms", function() {
                return tester
                    .setup.user.addr('082111')
                    .inputs(
                        {session_event: 'new'}  // dial in
                        , '12345'   // state_auth_code - personnel code
                        , '0803304899' // state_msisdn - mobile number
                        , '1'  // state_msg_receiver - mother
                        , '2'  // state_msg_pregnant - baby
                        , '4'  // state_baby_birth_month_year - May 15
                        , '12' // state_baby_birth_day - 12
                        , '3'  // state_msg_language - igbo
                        , '2'   // state_msg_type - sms
                    )
                    .check.interaction({
                        state: 'state_end_sms',
                    })
                    .run();
            });
        });

        // TEST VALIDATION

        describe("Validation testing", function() {
            it("validate state_auth_code", function() {
                return tester
                    .setup.user.addr('082111')
                    .inputs(
                        {session_event: 'new'}  // dial in
                        , 'aaaaa'  // state_auth_code - invalid personnel code
                    )
                    .check.interaction({
                        state: 'state_auth_code',
                        reply: "Sorry, that is not a valid number. Please enter your unique personnel code. For example, 12345"
                    })
                    .run();
            });
            it("validate state_msisdn", function() {
                return tester
                    .setup.user.addr('082111')
                    .inputs(
                        {session_event: 'new'}  // dial in
                        , '12345'  // state_auth_code - personnel code
                        , 'aaaabbbbb'  // state_msisdn - mobile number
                    )
                    .check.interaction({
                        state: 'state_msisdn',
                        reply: "Sorry, that is not a valid number. Please enter the mobile number of the person who will receive the weekly messages. For example, 08033046899"
                    })
                    .run();
            });
            it("validate state_last_period_day", function() {
                return tester
                    .setup.user.addr('082111')
                    .inputs(
                        {session_event: 'new'}  // dial in
                        , '12345'   // state_auth_code - personnel code
                        , '0803304899' // state_msisdn - mobile number
                        , '1'  // state_msg_receiver - mother
                        , '1'  // state_msg_pregnant - mother
                        , '3'  // state_last_period_month - May 15
                        , '32' // state_last_period_day
                    )
                    .check.interaction({
                        state: 'state_last_period_day',
                        reply: "Sorry, that is not a valid number. What day of the month did the woman start her last period? For example, 12."
                    })
                    .run();
            });
            it("validate state_baby_birth_day", function() {
                return tester
                    .setup.user.addr('082111')
                    .inputs(
                        {session_event: 'new'}  // dial in
                        , '12345'   // state_auth_code - personnel code
                        , '0803304899' // state_msisdn - mobile number
                        , '1'  // state_msg_receiver - mother
                        , '2'  // state_msg_pregnancy_status - baby
                        , '3'  // state_baby_birth_month_year - May 15
                        , 'a'  // state_baby_birth_day
                    )
                    .check.interaction({
                        state: 'state_baby_birth_day',
                        reply: "Sorry, that is not a valid number. What day of the month was the baby born? For example, 12."
                    })
                    .run();
            });
        });
    });

});
