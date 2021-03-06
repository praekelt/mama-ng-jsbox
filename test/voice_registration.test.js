var vumigo = require('vumigo_v02');
var moment = require('moment');
var assert = require('assert');
var fixtures = require('./fixtures_registration');
var AppTester = vumigo.AppTester;


describe("Mama Nigeria App", function() {
    describe("Voice Registration", function() {
        var app;
        var tester;

        beforeEach(function() {
            app = new go.app.GoApp();
            tester = new AppTester(app);

            tester
                .setup.config.app({
                    testing_today: '2017-07-22',
                    name: 'voice-registration-test',
                    country_code: '234',  // nigeria
                    env: 'test',
                    metric_store: 'test_metric_store',
                    services: {
                        identities: {
                            api_token: 'test_token_identities',
                            url: "http://localhost:8001/api/v1/"
                        },
                        registrations: {
                            api_token: 'test_token_registrations',
                            url: "http://localhost:8002/api/v1/"
                        },
                        voice_content: {
                            api_token: "test_token_voice_content",
                            url: "http://localhost:8004/api/v1/"
                        },
                        subscriptions: {
                            api_token: 'test_token_subscriptions',
                            url: "http://localhost:8005/api/v1/"
                        },
                        message_sender: {
                            api_token: 'test_token_message_sender',
                            url: "http://localhost:8006/api/v1/"
                        }
                    }
                })
                .setup(function(api) {
                    fixtures().forEach(function(d) {
                        api.http.fixtures.add(d);
                    });
                })
                ;
        });


        // TEST ANSWER RESET

        describe("When you go back to the main menu", function() {
            it("should reset the user answers", function() {
                return tester
                    .setup.user.addr('07030010001')
                    .inputs(
                        {session_event: 'new'},
                        '12345'  // state_personnel_auth
                        , '0'  // restart
                    )
                    .check.interaction({
                        state: 'state_msg_receiver'
                    })
                    .check.user.answers({
                        "operator_id": "cb245673-aa41-4302-ac47-00000000007",
                        "state_personnel_auth": "12345"
                    })
                    .run();
            });
        });

        // TEST REGISTRATION FLOW

        describe("When you start the app", function() {
            describe("if the user is a registered healthworker (has personnel code)", function() {
                it("should navigate to state_personnel_auth", function() {
                    // we cannot rely on the user being identified via caller id,
                    // so the personnel code should always be gathered first
                    return tester
                        .setup.user.addr('08080070007')
                        .inputs(
                            {session_event: 'new'}
                        )
                        .check.interaction({
                            state: 'state_personnel_auth'
                        })
                        .check.reply.properties({
                            helper_metadata: {
                                voice: {
                                    speech_url: ['http://localhost:8004/api/v1/eng_NG/state_personnel_auth_1.mp3'],
                                    wait_for: '#',
                                    barge_in: true
                                }
                            }
                        })
                        .check(function(api) {
                            var expected_used = [79];
                            var fixts = api.http.fixtures.fixtures;
                            var fixts_used = [];
                            fixts.forEach(function(f, i) {
                                f.uses > 0 ? fixts_used.push(i) : null;
                            });
                            assert.deepEqual(fixts_used, expected_used);
                        })
                        .check(function(api) {
                            var metrics = api.metrics.stores.test_metric_store;
                            assert.deepEqual(metrics, undefined);
                        })
                        .run();
                });
            });
            describe("if the user is not a registered healthworker", function() {
                it("should navigate to state_personnel_auth", function() {
                    return tester
                        .setup.user.addr('07030010001')
                        .inputs(
                            {session_event: 'new'}
                        )
                        .check.interaction({
                            state: 'state_personnel_auth'
                        })
                        .check.reply.properties({
                            helper_metadata: {
                                voice: {
                                    speech_url: ['http://localhost:8004/api/v1/eng_NG/state_personnel_auth_1.mp3'],
                                    wait_for: '#',
                                    barge_in: true
                                }
                            }
                        })
                        .run();
                });
                it("should repeat state_personnel_auth", function() {
                    return tester
                        .setup.user.addr('07030010001')
                        .inputs(
                            {session_event: 'new'},
                            '*' // state_personnel_auth
                        )
                        .check.interaction({
                            state: 'state_personnel_auth'
                        })
                        .check.reply.properties({
                            helper_metadata: {
                                voice: {
                                    speech_url: ['http://localhost:8004/api/v1/eng_NG/state_personnel_auth_1.mp3'],
                                    wait_for: '#',
                                    barge_in: true
                                }
                            }
                        })
                        .run();
                });
            });
        });

        describe("Entering a personnel (chew) code", function() {
            describe("if code validates", function() {
                it("should navigate to state_msg_receiver", function() {
                    return tester
                        .setup.user.addr('07030010001')
                        .inputs(
                            {session_event: 'new'},
                            '12345'  // state_personnel_auth
                        )
                        .check.interaction({
                            state: 'state_msg_receiver'
                        })
                        .check.reply.properties({
                            helper_metadata: {
                                voice: {
                                    speech_url: ['http://localhost:8004/api/v1/eng_NG/state_msg_receiver_1.mp3'],
                                    wait_for: '#',
                                    barge_in: true
                                }
                            }
                        })
                        .check(function(api) {
                            var metrics = api.metrics.stores.test_metric_store;
                            assert.deepEqual(metrics['test.voice_registration_test.registrations_started'].values, [1]);
                            assert.deepEqual(metrics['test.voice_registration_test.registrations_completed'], undefined);
                            assert.deepEqual(metrics['test.voice_registration_test.time_to_register'], undefined);
                        })
                        .run();
                });
            });

            describe("if personnel code does not validate", function() {
                it("should retry", function() {
                    return tester
                        .setup.user.addr('07030010001')
                        .inputs(
                            {session_event: 'new'}
                            , 'aaaaa'  // state_personnel_auth
                        )
                        .check.interaction({
                            state: 'state_personnel_auth'
                        })
                        .check.reply.properties({
                            helper_metadata: {
                                voice: {
                                    speech_url: [
                                        'http://localhost:8004/api/v1/eng_NG/state_error_invalid_number.mp3',
                                        'http://localhost:8004/api/v1/eng_NG/state_personnel_auth_1.mp3'
                                    ],
                                    wait_for: '#',
                                    barge_in: true
                                }
                            }
                        })
                        .run();
                });
            });

            describe("if the retried code does not validate", function() {
                it("should retry again", function() {
                    return tester
                        .setup.user.addr('07030010001')
                        .inputs(
                            {session_event: 'new'}
                            ,'aaaaa'  // state_personnel_auth
                            ,'aaaaa'  // state_personnel_auth
                        )
                        .check.interaction({
                            state: 'state_personnel_auth'
                        })
                        .check.reply.properties({
                            helper_metadata: {
                                voice: {
                                    speech_url: [
                                        'http://localhost:8004/api/v1/eng_NG/state_error_invalid_number.mp3',
                                        'http://localhost:8004/api/v1/eng_NG/state_personnel_auth_1.mp3'
                                    ],
                                    wait_for: '#',
                                    barge_in: true
                                }
                            }
                        })
                        .run();
                });
            });

            describe("if the user tries to restart with 0", function() {
                it("should not restart", function() {
                    return tester
                        .setup.user.addr('07030010001')
                        .inputs(
                            {session_event: 'new'}
                            , 'aaaaa'  // state_personnel_auth
                            , '0'      // state_personnel_auth
                        )
                        .check.interaction({
                            state: 'state_personnel_auth'
                        })
                        .check.reply.properties({
                            helper_metadata: {
                                voice: {
                                    speech_url: [
                                        'http://localhost:8004/api/v1/eng_NG/state_error_invalid_number.mp3',
                                        'http://localhost:8004/api/v1/eng_NG/state_personnel_auth_1.mp3'
                                    ],
                                    wait_for: '#',
                                    barge_in: true
                                }
                            }
                        })
                        .run();
                });
            });

            describe("if the retried personnel code validates", function() {
                it("should navigate to state_msg_receiver", function() {
                    return tester
                        .setup.user.addr('07030010001')
                        .inputs(
                            {session_event: 'new'}
                            ,'aaaaa'  // state_personnel_auth
                            ,'12345'  // state_personnel_auth
                        )
                        .check.interaction({
                            state: 'state_msg_receiver'
                        })
                        .check.reply.properties({
                            helper_metadata: {
                                voice: {
                                    speech_url: ['http://localhost:8004/api/v1/eng_NG/state_msg_receiver_1.mp3'],
                                    wait_for: '#',
                                    barge_in: true
                                }
                            }
                        })
                        .run();
                });
            });
        });

        describe("Flows from chosen message receiver options", function() {
            describe("(option 1 - Mother & Father as receivers)", function() {
                it("to state_msisdn_mother", function() {
                    return tester
                        .setup.user.addr('07030010001')
                        .inputs(
                            {session_event: 'new'}
                            , '12345'  // state_personnel_auth
                            , '1'      // state_msg_receiver - mother & father
                        )
                        .check.interaction({
                            state: 'state_msisdn_mother'
                        })
                        .check.reply.properties({
                            helper_metadata: {
                                voice: {
                                    speech_url: ['http://localhost:8004/api/v1/eng_NG/state_msisdn_mother_1.mp3'],
                                    wait_for: '#',
                                    barge_in: true
                                }
                            }
                        })
                        .run();
                });
                it("to state_msisdn_mother", function() {
                    return tester
                        .setup.user.addr('07030010001')
                        .inputs(
                            {session_event: 'new'}
                            , '12345'   // state_personnel_auth
                            , '1'       // state_msg_receiver - mother & father
                            , '12345'   // state_msisdn_mother
                        )
                        .check.interaction({
                            state: 'state_msisdn_mother'
                        })
                        .check.reply.properties({
                            helper_metadata: {
                                voice: {
                                    speech_url: [
                                        'http://localhost:8004/api/v1/eng_NG/state_error_invalid_number.mp3',
                                        'http://localhost:8004/api/v1/eng_NG/state_msisdn_mother_1.mp3'
                                    ],
                                    wait_for: '#',
                                    barge_in: true
                                }
                            }
                        })
                        .run();
                });
                it("to state_msisdn_already_registered (from state_msisdn_mother)", function() {
                    return tester
                        .setup.user.addr('07030010001')
                        .inputs(
                            {session_event: 'new'}
                            , '12345'        // state_personnel_auth
                            , '1'            // state_msg_receiver - mother_father
                            , '07070050005'  // state_msisdn_mother
                        )
                        .check.interaction({
                            state: 'state_msisdn_already_registered'
                        })
                        .check.reply.properties({
                            helper_metadata: {
                                voice: {
                                    speech_url: ['http://localhost:8004/api/v1/eng_NG/state_msisdn_already_registered_1.mp3'],
                                    wait_for: '#',
                                    barge_in: true
                                }
                            }
                        })
                        .run();
                });
                it("to state_msisdn_mother (from state_msisdn_already_registered)", function() {
                    return tester
                        .setup.user.addr('07030010001')
                        .inputs(
                            {session_event: 'new'}
                            , '12345'        // state_personnel_auth
                            , '1'            // state_msg_receiver - mother_father
                            , '07070050005'  // state_msisdn_mother
                            , '1'            // state_msisdn_already_registered
                        )
                        .check.interaction({
                            state: 'state_msisdn_mother'
                        })
                        .check.reply.properties({
                            helper_metadata: {
                                voice: {
                                    speech_url: ['http://localhost:8004/api/v1/eng_NG/state_msisdn_mother_1.mp3'],
                                    wait_for: '#',
                                    barge_in: true
                                }
                            }
                        })
                        .run();
                });
                it("to state_msisdn_household (father message receiver)", function() {
                    return tester
                        .setup.user.addr('07030010001')
                        .inputs(
                            {session_event: 'new'}
                            , '12345'        // state_personnel_auth
                            , '1'            // state_msg_receiver - mother & father
                            , '09094444444'  // state_msisdn_mother
                        )
                        .check.interaction({
                            state: 'state_msisdn_household'
                        })
                        .check.reply.properties({
                            helper_metadata: {
                                voice: {
                                    speech_url: ['http://localhost:8004/api/v1/eng_NG/state_msisdn_household_1.mp3'],
                                    wait_for: '#',
                                    barge_in: true
                                }
                            }
                        })
                        .run();
                });
                it("to state_msisdn_household (family member message receiver)", function() {
                    return tester
                        .setup.user.addr('07030010001')
                        .inputs(
                            {session_event: 'new'}
                            , '12345'        // state_personnel_auth
                            , '4'            // state_msg_receiver - mother & family member
                            , '09094444444'  // state_msisdn_mother
                        )
                        .check.interaction({
                            state: 'state_msisdn_household'
                        })
                        .check.reply.properties({
                            helper_metadata: {
                                voice: {
                                    speech_url: ['http://localhost:8004/api/v1/eng_NG/state_msisdn_household_2.mp3'],
                                    wait_for: '#',
                                    barge_in: true
                                }
                            }
                        })
                        .run();
                });
                it("to state_msisdn_household (friend message receiver)", function() {
                    return tester
                        .setup.user.addr('07030010001')
                        .inputs(
                            {session_event: 'new'}
                            , '12345'        // state_personnel_auth
                            , '5'            // state_msg_receiver - mother & friend
                            , '09094444444'  // state_msisdn_mother
                        )
                        .check.interaction({
                            state: 'state_msisdn_household'
                        })
                        .check.reply.properties({
                            helper_metadata: {
                                voice: {
                                    speech_url: ['http://localhost:8004/api/v1/eng_NG/state_msisdn_household_3.mp3'],
                                    wait_for: '#',
                                    barge_in: true
                                }
                            }
                        })
                        .run();
                });
                it("to state_msisdn_household", function() {
                    return tester
                        .setup.user.addr('07030010001')
                        .inputs(
                            {session_event: 'new'}
                            , '12345'        // state_personnel_auth
                            , '1'            // state_msg_receiver - mother & father
                            , '09094444444'  // state_msisdn_mother
                            , '08020002'     // state_msisdn_household
                        )
                        .check.interaction({
                            state: 'state_msisdn_household'
                        })
                        .check.reply.properties({
                            helper_metadata: {
                                voice: {
                                    speech_url: [
                                        'http://localhost:8004/api/v1/eng_NG/state_error_invalid_number.mp3',
                                        'http://localhost:8004/api/v1/eng_NG/state_msisdn_household_1.mp3'
                                    ],
                                    wait_for: '#',
                                    barge_in: true
                                }
                            }
                        })
                        .run();
                });
                it("to state_last_period_year", function() {
                    return tester
                        .setup.user.addr('07030010001')
                        .inputs(
                            {session_event: 'new'}
                            , '12345'        // state_personnel_auth
                            , '1'            // state_msg_receiver - mother & father
                            , '09094444444'  // state_msisdn_mother
                            , '09095555555'  // state_msisdn_household
                        )
                        .check.interaction({
                            state: 'state_last_period_year'
                        })
                        .check.reply.properties({
                            helper_metadata: {
                                voice: {
                                    speech_url: ['http://localhost:8004/api/v1/eng_NG/state_last_period_year_1.mp3'],
                                    wait_for: '#',
                                    barge_in: true
                                }
                            }
                        })
                        .run();
                });
            });
            describe("(option 2,4,5 - Mother or others)", function() {
                it("to state_msisdn", function() {
                    return tester
                        .setup.user.addr('07030010001')
                        .inputs(
                            {session_event: 'new'}
                            , '12345'  // state_personnel_auth
                            , '7'      // state_msg_receiver - family member
                        )
                        .check.interaction({
                            state: 'state_msisdn'
                        })
                        .check.reply.properties({
                            helper_metadata: {
                                voice: {
                                    speech_url: ['http://localhost:8004/api/v1/eng_NG/state_msisdn_2.mp3'],
                                    wait_for: '#',
                                    barge_in: true
                                }
                            }
                        })
                        .run();
                });
                it("to state_msisdn - retry", function() {
                    return tester
                        .setup.user.addr('07030010001')
                        .inputs(
                            {session_event: 'new'}
                            , '12345'     // state_personnel_auth
                            , '7'         // state_msg_receiver - family member
                            , '08567898'  // state_msisdn
                        )
                        .check.interaction({
                            state: 'state_msisdn'
                        })
                        .check.reply.properties({
                            helper_metadata: {
                                voice: {
                                    speech_url: [
                                        'http://localhost:8004/api/v1/eng_NG/state_error_invalid_number.mp3',
                                        'http://localhost:8004/api/v1/eng_NG/state_msisdn_2.mp3'
                                    ],
                                    wait_for: '#',
                                    barge_in: true
                                }
                            }
                        })
                        .run();
                });
                it("repeat state_msisdn - retry", function() {
                    return tester
                        .setup.user.addr('07030010001')
                        .inputs(
                            {session_event: 'new'}
                            , '12345'     // state_personnel_auth
                            , '7'         // state_msg_receiver - family member
                            , '08567898'  // state_msisdn
                            , '*'  // repeat
                        )
                        .check.interaction({
                            state: 'state_msisdn'
                        })
                        .check.reply.properties({
                            helper_metadata: {
                                voice: {
                                    speech_url: [
                                        'http://localhost:8004/api/v1/eng_NG/state_error_invalid_number.mp3',
                                        'http://localhost:8004/api/v1/eng_NG/state_msisdn_2.mp3'
                                    ],
                                    wait_for: '#',
                                    barge_in: true
                                }
                            }
                        })
                        .run();
                });
                it("restart from state_msisdn", function() {
                    return tester
                        .setup.user.addr('07030010001')
                        .inputs(
                            {session_event: 'new'}
                            , '12345'     // state_personnel_auth
                            , '7'         // state_msg_receiver - family member
                            , '08567898'  // state_msisdn
                            , '0' // restart
                        )
                        .check.interaction({
                            state: 'state_msg_receiver'
                        })
                        .run();
                });
                it("to state_last_period_year (via st-03)", function() {
                    return tester
                        .setup.user.addr('07030010001')
                        .inputs(
                            {session_event: 'new'}
                            , '12345'        // state_personnel_auth
                            , '7'            // state_msg_receiver - family member
                            , '09092222222'  // state_msisdn
                        )
                        .check.interaction({
                            state: 'state_last_period_year'
                        })
                        .run();
                });
                it("to state_last_period_year (via retry state st-03 retry)", function() {
                    return tester
                        .setup.user.addr('07030010001')
                        .inputs(
                            {session_event: 'new'}
                            , '12345'        // state_personnel_auth
                            , '7'            // state_msg_receiver - family member
                            , 'a45521'       // state_msisdn
                            , '09092222222'  // state_msisdn
                        )
                        .check.interaction({
                            state: 'state_last_period_year'
                        })
                        .run();
                });
                it("to state_last_period_year (because it's family_only)", function() {
                    return tester
                        .setup.user.addr('07030010001')
                        .inputs(
                            {session_event: 'new'}
                            , '12345'        // state_personnel_auth
                            , '7'            // state_msg_receiver - family member
                            , '09097777777'  // state_msisdn
                        )
                        .check.interaction({
                            state: 'state_last_period_year'
                        })
                        .check.reply.properties({
                            helper_metadata: {
                                voice: {
                                    speech_url: ['http://localhost:8004/api/v1/eng_NG/state_last_period_year_1.mp3'],
                                    wait_for: '#',
                                    barge_in: true
                                }
                            }
                        })
                        .run();
                });
                it("to state_msisdn_already_registered", function() {
                    return tester
                        .setup.user.addr('07030010001')
                        .inputs(
                            {session_event: 'new'}
                            , '12345'        // state_personnel_auth
                            , '2'            // state_msg_receiver - mother_only
                            , '09097777777'  // state_msisdn
                        )
                        .check.interaction({
                            state: 'state_msisdn_already_registered'
                        })
                        .check.reply.properties({
                            helper_metadata: {
                                voice: {
                                    speech_url: ['http://localhost:8004/api/v1/eng_NG/state_msisdn_already_registered_1.mp3'],
                                    wait_for: '#',
                                    barge_in: true
                                }
                            }
                        })
                        .run();
                });
                it("to state_msisdn (from state_msisdn_already_registered)", function() {
                    return tester
                        .setup.user.addr('07030010001')
                        .inputs(
                            {session_event: 'new'}
                            , '12345'        // state_personnel_auth
                            , '2'            // state_msg_receiver - mother_only
                            , '09097777777'  // state_msisdn
                            , '1'  // state_msisdn_already_registered - register a diff num
                        )
                        .check.interaction({
                            state: 'state_msisdn'
                        })
                        .check.reply.properties({
                            helper_metadata: {
                                voice: {
                                    speech_url: ['http://localhost:8004/api/v1/eng_NG/state_msisdn_1.mp3'],
                                    wait_for: '#',
                                    barge_in: true
                                }
                            }
                        })
                        .run();
                });
                it("to state_msg_receiver (from state_msisdn_already_registered)", function() {
                    return tester
                        .setup.user.addr('07030010001')
                        .inputs(
                            {session_event: 'new'}
                            , '12345'        // state_personnel_auth
                            , '2'            // state_msg_receiver - mother_only
                            , '09097777777'  // state_msisdn
                            , '2'  // state_msisdn_already_registered - choose diff receiver
                        )
                        .check.interaction({
                            state: 'state_msg_receiver'
                        })
                        .check.reply.properties({
                            helper_metadata: {
                                voice: {
                                    speech_url: ['http://localhost:8004/api/v1/eng_NG/state_msg_receiver_1.mp3'],
                                    wait_for: '#',
                                    barge_in: true
                                }
                            }
                        })
                        .run();
                });
                it("to state_end_msisdn (from state_msisdn_already_registered)", function() {
                    return tester
                        .setup.user.addr('07030010001')
                        .inputs(
                            {session_event: 'new'}
                            , '12345'        // state_personnel_auth
                            , '2'            // state_msg_receiver - mother_only
                            , '09097777777'  // state_msisdn
                            , '3'  // state_msisdn_already_registered - exit
                        )
                        .check.interaction({
                            state: 'state_end_msisdn'
                        })
                        .check.reply.properties({
                            helper_metadata: {
                                voice: {
                                    speech_url: ['http://localhost:8004/api/v1/eng_NG/state_end_msisdn_1.mp3'],
                                    wait_for: '#',
                                    barge_in: false
                                }
                            }
                        })
                        .check.reply.ends_session()
                        .run();
                });
            });
        });

        describe("When a msisdn exists but is opted out", function() {
            it("should navigate to state_last_period_year", function() {
                return tester
                    .setup.user.addr('07030010009')
                    .inputs(
                        {session_event: 'new'}
                        , '12345'       // state_personnel_auth
                        , '2'           // state_msg_receiver - friend_only
                        , '07030010009' // state_msisdn
                    )
                    .check.interaction({
                        state: 'state_last_period_year'
                    })
                    .run();
            });
            it("should update to remove the optedout flag", function() {
                return tester
                    .setup.user.addr('07030010009')
                    .inputs(
                        {session_event: 'new'}
                        , '12345'       // state_personnel_auth
                        , '2'           // state_msg_receiver - mother_only
                        , '07030010009' // state_msisdn
                        , '2'           // state_last_period_year - last year
                        , '12'           // state_last_period_month - dec
                        , '13'          // state_last_period_day

                        , '2'           // state_gravida
                        , '2'           // state_msg_language - igbo
                        , '2'           // state_msg_type - sms
                    )
                    .check.interaction({
                        state: 'state_end_sms'
                    })
                    .check(function(api) {
                        var expected_used = [6, 79, 83, 84, 85, 86, 94];
                        var fixts = api.http.fixtures.fixtures;
                        var fixts_used = [];
                        fixts.forEach(function(f, i) {
                            f.uses > 0 ? fixts_used.push(i) : null;
                        });
                        assert.deepEqual(fixts_used, expected_used);
                    })
                    .check.reply.ends_session()
                    .run();
            });
        });

        describe("When you enter a choice state_msg_receiver", function() {
            describe("if it is a valid choice", function() {
                it("should navigate to state_last_period_year", function() {
                    return tester
                        .setup.user.addr('07030010001')
                        .inputs(
                            {session_event: 'new'}
                            , '12345'        // state_personnel_auth
                            , '1'            // state_msg_receiver - mother&father
                            , '09094444444'  // state_msisdn_mother
                            , '09095555555'  // state_msisdn_household
                        )
                        .check.interaction({
                            state: 'state_last_period_year'
                        })
                        .check.reply.properties({
                            helper_metadata: {
                                voice: {
                                    speech_url: ['http://localhost:8004/api/v1/eng_NG/state_last_period_year_1.mp3'],
                                    wait_for: '#',
                                    barge_in: true
                                }
                            }
                        })
                        .run();
                });
            });

            describe("if it is 0", function() {
                it("should restart", function() {
                    return tester
                        .setup.user.addr('07030010001')
                        .inputs(
                            {session_event: 'new'},
                            '12345'  // state_personnel_auth
                            , '0'    // state_msg_receiver - restart
                        )
                        .check.interaction({
                            state: 'state_msg_receiver'
                        })
                        .check.reply.properties({
                            helper_metadata: {
                                voice: {
                                    speech_url: ['http://localhost:8004/api/v1/eng_NG/state_msg_receiver_1.mp3'],
                                    wait_for: '#',
                                    barge_in: true
                                }
                            }
                    })
                        .run();
                });
            });

            describe("if it is an invalid choice", function() {
                it("should replay state_msg_receiver", function() {
                    return tester
                        .setup.user.addr('07030010001')
                        .inputs(
                            {session_event: 'new'},
                            '12345'
                            , '8'  // state_msg_receiver - invalid choice
                        )
                        .check.interaction({
                            state: 'state_msg_receiver'
                        })
                        .check.reply.properties({
                            helper_metadata: {
                                voice: {
                                    speech_url: ['http://localhost:8004/api/v1/eng_NG/state_msg_receiver_1.mp3'],
                                    wait_for: '#',
                                    barge_in: true
                                }
                            }
                        })
                        .run();
                });
            });
        });

        describe("When you enter a choice state_pregnancy_status", function() {
            describe("if you choose pregnant", function() {
                it("should navigate to state_last_period_year", function() {
                    return tester
                        .setup.user.addr('07030010001')
                        .inputs(
                            {session_event: 'new'}
                            , '12345'        // state_personnel_auth
                            , '1'            // state_msg_receiver - mother&father
                            , '09094444444'  // state_msisdn_mother
                            , '09095555555'  // state_msisdn_household
                            // , '1'            // state_pregnancy_status
                        )
                        .check.interaction({
                            state: 'state_last_period_year'
                        })
                        .check.reply.properties({
                            helper_metadata: {
                                voice: {
                                    speech_url: ['http://localhost:8004/api/v1/eng_NG/state_last_period_year_1.mp3'],
                                    wait_for: '#',
                                    barge_in: true
                                }
                            }
                        })
                        .run();
                });
            });
            // bypass postbirth flow
            describe.skip("if you choose baby", function() {
                it("should navigate to state_baby_birth_year", function() {
                    return tester
                        .setup.user.addr('07030010001')
                        .inputs(
                            {session_event: 'new'}
                            , '12345'        // state_personnel_auth
                            , '1'            // state_msg_receiver - mother&father
                            , '09094444444'  // state_msisdn_mother
                            , '09095555555'  // state_msisdn_household
                            // , '2'            // state_pregnancy_status - baby
                        )
                        .check.interaction({
                            state: 'state_baby_birth_year'
                        })
                        .check.reply.properties({
                            helper_metadata: {
                                voice: {
                                    speech_url: ['http://localhost:8004/api/v1/eng_NG/state_baby_birth_year_1.mp3'],
                                    wait_for: '#',
                                    barge_in: true
                                }
                            }
                        })
                        .run();
                });
            });
        });

        // pregnant
        describe("when you enter a last period year", function() {
            describe("if 'this year' is chosen", function() {
                it("should navigate to state_last_period_month", function() {
                    return tester
                        .setup.user.addr('07030010001')
                        .inputs(
                            {session_event: 'new'}
                            , '12345'        // state_personnel_auth
                            , '1'            // state_msg_receiver - mother&father
                            , '09094444444'  // state_msisdn_mother
                            , '09095555555'  // state_msisdn_household
                            // , '1'            // state_pregnancy_status - pregnant  // bypass postbirth flow
                            , '1'            // state_last_period_year
                        )
                        .check.interaction({
                            state: 'state_last_period_month',
                            reply: [
                                "Period month this/last year?",
                                "1. January",
                                "2. February",
                                "3. March",
                                "4. April",
                                "5. May",
                                "6. June",
                                "7. July",
                                "8. August",
                                "9. September",
                                "10. October",
                                "11. November",
                                "12. December",
                            ].join('\n')
                        })
                        .check.reply.properties({
                            helper_metadata: {
                                voice: {
                                    speech_url: ['http://localhost:8004/api/v1/eng_NG/state_last_period_month_1.mp3'],
                                    wait_for: '#',
                                    barge_in: true
                                }
                            }
                        })
                        .run();
                    });

                    it("should navigate back to state_last_period_month", function() {
                        return tester
                            .setup.user.addr('07030010001')
                            .inputs(
                                {session_event: 'new'}
                                , '12345'           // state_personnel_auth
                                , '1'               // state_msg_receiver - mother&father
                                , '09095555555'     // state_msisdn_household
                                , '09094444444'     // state_msisdn_mother
                                // , '1'               // state_pregnancy_status - pregnant  // bypass postbirth flow
                                , '1'               // state_last_period_year
                                , '12'              // state_last_period_month
                            )
                            .check.interaction({
                                state: 'state_last_period_month',
                                reply: [
                                    "Period month this/last year?",
                                    "1. January",
                                    "2. February",
                                    "3. March",
                                    "4. April",
                                    "5. May",
                                    "6. June",
                                    "7. July",
                                    "8. August",
                                    "9. September",
                                    "10. October",
                                    "11. November",
                                    "12. December",
                                ].join('\n')
                            })
                            .check.reply.properties({
                                helper_metadata: {
                                    voice: {
                                        speech_url: [
                                            'http://localhost:8004/api/v1/eng_NG/state_error_invalid_date.mp3',
                                            'http://localhost:8004/api/v1/eng_NG/state_last_period_month_1.mp3'
                                        ],
                                        wait_for: '#',
                                        barge_in: true
                                    }
                                }
                            })
                            .run();
                        });
            });

            describe("if 'last year' is chosen", function() {
                it("should navigate to state_last_period_month", function() {
                    return tester
                        .setup.user.addr('07030010001')
                        .inputs(
                            {session_event: 'new'}
                            , '12345'        // state_personnel_auth
                            , '1'            // state_msg_receiver - mother&father
                            , '09094444444'  // state_msisdn_mother
                            , '09095555555'  // state_msisdn_household
                            // , '1'            // state_pregnancy_status - pregnant  // bypass postbirth flow
                            , '2'            // state_last_period_year - last year
                        )
                        .check.interaction({
                            state: 'state_last_period_month'
                        })
                        .check.reply.properties({
                            helper_metadata: {
                                voice: {
                                    speech_url: ['http://localhost:8004/api/v1/eng_NG/state_last_period_month_2.mp3'],
                                    wait_for: '#',
                                    barge_in: true
                                }
                            }
                        })
                        .run();
                });
                it("should navigate back to state_last_period_month", function() {
                    return tester
                        .setup.user.addr('07030010001')
                        .inputs(
                            {session_event: 'new'}
                            , '12345'           // state_personnel_auth
                            , '1'               // state_msg_receiver - mother&father
                            , '09095555555'     // state_msisdn_household
                            , '09094444444'     // state_msisdn_mother
                            // , '1'               // state_pregnancy_status - pregnant  // bypass postbirth flow
                            , '2'               // state_last_period_year - last year
                            , '1'               // state_last_period_month - jan
                        )
                        .check.interaction({
                            state: 'state_last_period_month'
                        })
                        .check.reply.properties({
                            helper_metadata: {
                                voice: {
                                    speech_url: [
                                        'http://localhost:8004/api/v1/eng_NG/state_error_invalid_date.mp3',
                                        'http://localhost:8004/api/v1/eng_NG/state_last_period_month_2.mp3'
                                    ],
                                    wait_for: '#',
                                    barge_in: true
                                }
                            }
                        })
                        .run();
                });
            });
        });

        // baby
        // bypass postbirth flow
        describe.skip("When you enter a baby_birth year", function() {
            describe("if 'this year' chosen", function() {
                it("should navigate to state_baby_birth_month", function() {
                    return tester
                        .setup.user.addr('07030010001')
                        .inputs(
                            {session_event: 'new'}
                            , '12345'        // state_personnel_auth
                            , '1'            // state_msg_receiver - mother&father
                            , '09094444444'  // state_msisdn_mother
                            , '09095555555'  // state_msisdn_household
                            , '2'            // state_pregnancy_status - baby
                            , '1'            // state_baby_birth_year - this year
                        )
                        .check.interaction({
                            state: 'state_baby_birth_month'
                        })
                        .check.reply.properties({
                            helper_metadata: {
                                voice: {
                                    speech_url: ['http://localhost:8004/api/v1/eng_NG/state_baby_birth_month_1.mp3'],
                                    wait_for: '#',
                                    barge_in: true
                                }
                            }
                        })
                        .run();
                });
                it("should navigate back to state_baby_birth_month", function() {
                    return tester
                        .setup.user.addr('07030010001')
                        .inputs(
                            {session_event: 'new'}
                            , '12345'        // state_personnel_auth
                            , '1'            // state_msg_receiver - mother&father
                            , '09094444444'  // state_msisdn_mother
                            , '09095555555'  // state_msisdn_household
                            , '2'            // state_pregnancy_status - baby
                            , '1'            // state_baby_birth_year - this year
                            , '11'           // state_baby_birth_month - nov
                        )
                        .check.interaction({
                            state: 'state_baby_birth_month'
                        })
                        .check.reply.properties({
                            helper_metadata: {
                                voice: {
                                    speech_url: ['http://localhost:8004/api/v1/eng_NG/state_baby_birth_month_1.mp3'],
                                    wait_for: '#',
                                    barge_in: true
                                }
                            }
                        })
                        .run();
                });
            });

            describe("if 'last year' chosen", function() {
                it("should navigate to state_baby_birth_month", function() {
                    return tester
                        .setup.user.addr('07030010001')
                        .inputs(
                            {session_event: 'new'}
                            , '12345'        // state_personnel_auth
                            , '1'            // state_msg_receiver - mother&father
                            , '09094444444'  // state_msisdn_mother
                            , '09095555555'  // state_msisdn_household
                            , '2'            // state_pregnancy_status
                            , '2'            // state_baby_birth_year
                        )
                        .check.interaction({
                            state: 'state_baby_birth_month'
                        })
                        .check.reply.properties({
                            helper_metadata: {
                                voice: {
                                    speech_url: ['http://localhost:8004/api/v1/eng_NG/state_baby_birth_month_2.mp3'],
                                    wait_for: '#',
                                    barge_in: true
                                }
                            }
                        })
                        .run();
                });
                it("should navigate back to state_baby_birth_month", function() {
                    return tester
                        .setup.user.addr('07030010001')
                        .inputs(
                            {session_event: 'new'}
                            , '12345'        // state_personnel_auth
                            , '1'            // state_msg_receiver - mother&father
                            , '09094444444'  // state_msisdn_mother
                            , '09095555555'  // state_msisdn_household
                            , '2'            // state_pregnancy_status
                            , '2'            // state_baby_birth_year
                            , '1'            // state_baby_birth_month
                        )
                        .check.interaction({
                            state: 'state_baby_birth_month'
                        })
                        .check.reply.properties({
                            helper_metadata: {
                                voice: {
                                    speech_url: ['http://localhost:8004/api/v1/eng_NG/state_baby_birth_month_2.mp3'],
                                    wait_for: '#',
                                    barge_in: true
                                }
                            }
                        })
                        .run();
                });
            });
        });

        // pregnant
        describe("When you enter a last period month", function() {
            describe("if the month choice is not in valid range for this year", function() {
                it("should navigate back to state_last_period_month", function() {
                    return tester
                        .setup.user.addr('07030010001')
                        .inputs(
                            {session_event: 'new'}
                            , '12345'        // state_personnel_auth
                            , '1'            // state_msg_receiver - mother&father
                            , '09094444444'  // state_msisdn_mother
                            , '09095555555'  // state_msisdn_household
                            // , '1'            // state_pregnancy_status - pregnant  // bypass postbirth flow
                            , '1'            // state_last_period_year - this year
                            , '9'            // state_last_period_month - sep
                        )
                        .check.interaction({
                            state: 'state_last_period_month'
                        })
                        .check.reply.properties({
                            helper_metadata: {
                                voice: {
                                    speech_url: [
                                        'http://localhost:8004/api/v1/eng_NG/state_error_invalid_date.mp3',
                                        'http://localhost:8004/api/v1/eng_NG/state_last_period_month_1.mp3'
                                    ],
                                    wait_for: '#',
                                    barge_in: true
                                }
                            }
                        })
                        .run();
                });
            });
            describe("if the month choice is not in valid range for last year", function() {
                it("should navigate back to state_last_period_month", function() {
                    return tester
                        .setup.user.addr('07030010001')
                        .inputs(
                            {session_event: 'new'}
                            , '12345'        // state_personnel_auth
                            , '1'            // state_msg_receiver - mother&father
                            , '09094444444'  // state_msisdn_mother
                            , '09095555555'  // state_msisdn_household
                            // , '1'            // state_pregnancy_status - pregnant  // bypass postbirth flow
                            , '2'            // state_last_period_year - last year
                            , '3'            // state_last_period_month - mar
                        )
                        .check.interaction({
                            state: 'state_last_period_month'
                        })
                        .check.reply.properties({
                            helper_metadata: {
                                voice: {
                                    speech_url: [
                                        'http://localhost:8004/api/v1/eng_NG/state_error_invalid_date.mp3',
                                        'http://localhost:8004/api/v1/eng_NG/state_last_period_month_2.mp3'
                                    ],
                                    wait_for: '#',
                                    barge_in: true
                                }
                            }
                        })
                        .run();
                });
            });

            describe("if the month choice is valid", function() {
                it("should navigate to state_last_period_day", function() {
                    return tester
                        .setup.user.addr('07030010001')
                        .inputs(
                            {session_event: 'new'}
                            , '12345'       // state_personnel_auth
                            , '1'           // state_msg_receiver - mother&father
                            , '09094444444' // state_msisdn_mother
                            , '09095555555' // state_msisdn_household
                            // , '1'           // state_pregnancy_status - pregnant  // bypass postbirth flow
                            , '2'           // state_last_period_year - last year
                            , '12'          // state_last_period_month - dec
                        )
                        .check.interaction({
                            state: 'state_last_period_day'
                        })
                        .check.reply.properties({
                            helper_metadata: {
                                voice: {
                                    speech_url: ['http://localhost:8004/api/v1/eng_NG/state_last_period_day_12.mp3'],
                                    wait_for: '#',
                                    barge_in: true
                                }
                            }
                        })
                        .run();
                });
                it("should navigate back to state_last_period_day", function() {
                    return tester
                        .setup.user.addr('07030010001')
                        .inputs(
                            {session_event: 'new'}
                            , '12345'       // state_personnel_auth
                            , '1'           // state_msg_receiver - mother&father
                            , '09094444444' // state_msisdn_mother
                            , '09095555555' // state_msisdn_household
                            // , '1'           // state_pregnancy_status - pregnant  // bypass postbirth flow
                            , '2'           // state_last_period_year - last year
                            , '10'           // state_last_period_month - oct
                            , '32'          // state_last_period_day
                        )
                        .check.interaction({
                            state: 'state_last_period_day'
                        })
                        .check.reply.properties({
                            helper_metadata: {
                                voice: {
                                    speech_url: [
                                        'http://localhost:8004/api/v1/eng_NG/state_error_invalid_date.mp3',
                                        'http://localhost:8004/api/v1/eng_NG/state_last_period_day_10.mp3'
                                    ],
                                    wait_for: '#',
                                    barge_in: true
                                }
                            }
                        })
                        .run();
                });
                it("should navigate to state_invalid_date", function() {
                    return tester
                        .setup.user.addr('07030010001')
                        .inputs(
                            {session_event: 'new'}
                            , '12345'       // state_personnel_auth
                            , '1'           // state_msg_receiver - mother&father
                            , '09094444444' // state_msisdn_mother
                            , '09095555555' // state_msisdn_household
                            // , '1'           // state_pregnancy_status - pregnant  // bypass postbirth flow
                            , '2'           // state_last_period_year - last year
                            , '11'           // state_last_period_month - nov
                            , '32'          // state_last_period_day
                            , '31'          // state_last_period_day
                        )
                        .check.interaction({
                            state: 'state_invalid_date'
                        })
                        .check.reply.properties({
                            helper_metadata: {
                                voice: {
                                    speech_url: ['http://localhost:8004/api/v1/eng_NG/state_invalid_date_1.mp3'],
                                    wait_for: '#',
                                    barge_in: true
                                }
                            }
                        })
                        .run();
                });
            });
        });

        // baby
        // bypass postbirth flow
        describe.skip("When you enter a baby_birth_month", function() {
            describe("if the month choice is not in valid range for this year", function() {
                it("should navigate back to state_baby_birth_month", function() {
                    return tester
                        .setup.user.addr('07030010001')
                        .inputs(
                            {session_event: 'new'}
                            , '12345'           // state_personnel_auth
                            , '1'               // state_msg_receiver - mother&father
                            , '09094444444'     // state_msisdn_mother
                            , '09095555555'     // state_msisdn_household
                            , '2'               // state_pregnancy_status - baby
                            , '1'               // state_baby_birth_year - this year
                            , '8'               // state_baby_birth_month - aug
                        )
                        .check.interaction({
                            state: 'state_baby_birth_month'
                        })
                        .check.reply.properties({
                            helper_metadata: {
                                voice: {
                                    speech_url: ['http://localhost:8004/api/v1/eng_NG/state_baby_birth_month_1.mp3'],
                                    wait_for: '#',
                                    barge_in: true
                                }
                            }
                        })
                        .run();
                });
            });

            describe("if the month choice is not in valid range for last year", function() {
                it("should navigate back to state_baby_birth_month", function() {
                    return tester
                        .setup.user.addr('07030010001')
                        .inputs(
                            {session_event: 'new'}
                            , '12345'           // state_personnel_auth
                            , '1'               // state_msg_receiver - mother&father
                            , '09094444444'     // state_msisdn_mother
                            , '09095555555'     // state_msisdn_household
                            , '2'               // state_pregnancy_status - baby
                            , '2'               // state_baby_birth_year - last year
                            , '3'               // state_baby_birth_month - mar
                        )
                        .check.interaction({
                            state: 'state_baby_birth_month'
                        })
                        .check.reply.properties({
                            helper_metadata: {
                                voice: {
                                    speech_url: ['http://localhost:8004/api/v1/eng_NG/state_baby_birth_month_2.mp3'],
                                    wait_for: '#',
                                    barge_in: true
                                }
                            }
                        })
                        .run();
                });
            });

            describe("if the month choice is valid", function() {
                it("should navigate to state_baby_birth_day", function() {
                    return tester
                        .setup.user.addr('07030010001')
                        .inputs(
                            {session_event: 'new'}
                            , '12345'       // state_personnel_auth
                            , '6'           // state_msg_receiver - friend_only
                            , '09092222222' // state_msisdn
                            , '2'           // state_pregnancy_status - baby
                            , '2'           // state_baby_birth_year - last year
                            , '9'           // state_baby_birth_month - sep
                        )
                        .check.interaction({
                            state: 'state_baby_birth_day'
                        })
                        .check.reply.properties({
                            helper_metadata: {
                                voice: {
                                    speech_url: ['http://localhost:8004/api/v1/eng_NG/state_baby_birth_day_9.mp3'],
                                    wait_for: '#',
                                    barge_in: true
                                }
                            }
                        })
                        .run();
                });
                it("should navigate back to state_baby_birth_day", function() {
                    return tester
                        .setup.user.addr('07030010001')
                        .inputs(
                            {session_event: 'new'}
                            , '12345'       // state_personnel_auth
                            , '6'           // state_msg_receiver - friend_only
                            , '09092222222' // state_msisdn
                            , '2'           // state_pregnancy_status - baby
                            , '2'           // state_baby_birth_year - last year
                            , '9'           // state_baby_birth_month - sep
                            , '35'          // state_baby_birth_day
                        )
                        .check.interaction({
                            state: 'state_baby_birth_day'
                        })
                        .check.reply.properties({
                            helper_metadata: {
                                voice: {
                                    speech_url: [
                                        'http://localhost:8004/api/v1/eng_NG/state_error_invalid_date.mp3',
                                        'http://localhost:8004/api/v1/eng_NG/state_baby_birth_day_9.mp3'
                                    ],
                                    wait_for: '#',
                                    barge_in: true
                                }
                            }
                        })
                        .run();
                });
                it("should navigate to state_invalid_date", function() {
                    return tester
                        .setup.user.addr('07030010001')
                        .inputs(
                            {session_event: 'new'}
                            , '12345'       // state_personnel_auth
                            , '6'           // state_msg_receiver - friend_only
                            , '09092222222' // state_msisdn
                            , '2'           // state_pregnancy_status - baby
                            , '2'           // state_baby_birth_year - last year
                            , '9'           // state_baby_birth_month - sep
                            , '35'          // state_baby_birth_day
                            , '31'          // state_baby_birth_day
                        )
                        .check.interaction({
                            state: 'state_invalid_date'
                        })
                        .check.reply.properties({
                            helper_metadata: {
                                voice: {
                                    speech_url: ['http://localhost:8004/api/v1/eng_NG/state_invalid_date_1.mp3'],
                                    wait_for: '#',
                                    barge_in: true
                                }
                            }
                        })
                        .run();
                });
            });
        });

        // pregnant
        describe("when you enter a last period day", function() {
            describe("if it is an invalid day", function() {
                it("should navigate to state_last_period_day", function() {
                    return tester
                        .setup.user.addr('07030010001')
                        .inputs(
                            {session_event: 'new'}
                            , '12345'       // state_personnel_auth
                            , '6'           // state_msg_receiver - friend_only
                            , '09092222222' // state_msisdn
                            // , '1'           // state_pregnancy_status - pregnant  // bypass postbirth flow
                            , '2'           // state_last_period_year - last year
                            , '10'          // state_last_period_month - oct
                            , '32'          // state_last_period_day
                        )
                        .check.interaction({
                            state: 'state_last_period_day'
                        })
                        .check.reply.properties({
                            helper_metadata: {
                                voice: {
                                    speech_url: [
                                        'http://localhost:8004/api/v1/eng_NG/state_error_invalid_date.mp3',
                                        'http://localhost:8004/api/v1/eng_NG/state_last_period_day_10.mp3'
                                    ],
                                    wait_for: '#',
                                    barge_in: true
                                }
                            }
                        })
                        .run();
                });
            });

            describe("if it is too soon to current date", function(){
                it("should give an error have the user retry date entry", function() {
                    return tester
                        .setup.user.addr('07030010001')
                        .inputs(
                            {session_event: 'new'}
                            , '12345'       // state_personnel_auth
                            , '6'           // state_msg_receiver - friend_only
                            , '09092222222' // state_msisdn
                            // , '1'           // state_pregnancy_status - pregnant  // bypass postbirth flow
                            , '1'           // state_last_period_year - this year
                            , '6'          // state_last_period_month - June
                            , '20'          // state_last_period_day
                        )
                        .check.interaction({
                            state: 'state_invalid_date'
                        })
                        .check.reply.properties({
                            helper_metadata: {
                                voice: {
                                    speech_url: [
                                        'http://localhost:8004/api/v1/eng_NG/state_invalid_date_1.mp3'
                                    ],
                                    wait_for: '#',
                                    barge_in: true
                                }
                            }
                        })
                        .run();
                });
            });

            describe("if it is a valid day", function() {
                it("should navigate to state_gravida", function() {
                    return tester
                        .setup.user.addr('07030010001')
                        .inputs(
                            {session_event: 'new'}
                            , '12345'       // state_personnel_auth
                            , '6'           // state_msg_receiver - friend_only
                            , '09092222222' // state_msisdn
                            // , '1'           // state_pregnancy_status - pregnant  // bypass postbirth flow
                            , '2'           // state_last_period_year - last year
                            , '10'          // state_last_period_month - oct
                            , '22'          // state_last_period_day
                        )
                        .check.interaction({
                            state: 'state_gravida'
                        })
                        .check.reply.properties({
                            helper_metadata: {
                                voice: {
                                    speech_url: ['http://localhost:8004/api/v1/eng_NG/state_gravida_1.mp3'],
                                    wait_for: '#',
                                    barge_in: true
                                }
                            }
                        })
                        .run();
                });
            });

            describe("if it is a valid single-digit day", function() {
                it("should navigate to state_gravida", function() {
                    return tester
                        .setup.user.addr('07030010001')
                        .inputs(
                            {session_event: 'new'}
                            , '12345'       // state_personnel_auth
                            , '6'           // state_msg_receiver - friend_only
                            , '09092222222' // state_msisdn
                            // , '1'           // state_pregnancy_status - pregnant  // bypass postbirth flow
                            , '2'           // state_last_period_year - last year
                            , '10'          // state_last_period_month - oct
                            , '2'           // state_last_period_day
                        )
                        .check.interaction({
                            state: 'state_gravida'
                        })
                        .check.reply.properties({
                            helper_metadata: {
                                voice: {
                                    speech_url: ['http://localhost:8004/api/v1/eng_NG/state_gravida_1.mp3'],
                                    wait_for: '#',
                                    barge_in: true
                                }
                            }
                        })
                        .run();
                });
            });
        });

        describe('capture gravida', function () {
            it('should be a valid integer', function () {
                return tester
                    .setup.user.addr('07030010001')
                    .inputs(
                        {session_event: 'new'}
                        , '12345'       // state_personnel_auth
                        , '6'           // state_msg_receiver - friend_only
                        , '09092222222' // state_msisdn
                        , '2'           // state_pregnancy_status - baby
                        , '2'           // state_baby_birth_year - last year
                        , '11'          // state_baby_birth_month - nov
                        , '12'          // state_baby_birth_day
                        , 'XX'           // state_gravida, invalid input
                    )
                    .check.interaction({
                        state: 'state_gravida'
                    })
                    .check.reply.properties({
                        helper_metadata: {
                            voice: {
                                speech_url: [
                                    'http://localhost:8004/api/v1/eng_NG/state_error_invalid_number.mp3',
                                    'http://localhost:8004/api/v1/eng_NG/state_gravida_1.mp3',
                                ],
                                wait_for: '#',
                                barge_in: true
                            }
                        }
                    })
                    .run();
            });
        });

        // bypass postbirth flow
        describe.skip("when you enter a baby birth day", function() {
            describe("if it is an invalid day", function() {
                it("should navigate back to state_baby_birth_day", function() {
                    return tester
                        .setup.user.addr('07030010001')
                        .inputs(
                            {session_event: 'new'}
                            , '12345'       // state_personnel_auth
                            , '6'           // state_msg_receiver - friend_only
                            , '09092222222' // state_msisdn
                            , '2'           // state_pregnancy_status - baby
                            , '2'           // state_baby_birth_year - last year
                            , '11'          // state_baby_birth_month - nov
                            , '32'          // state_baby_birth_day
                        )
                        .check.interaction({
                            state: 'state_baby_birth_day'
                        })
                        .check.reply.properties({
                            helper_metadata: {
                                voice: {
                                    speech_url: ['http://localhost:8004/api/v1/eng_NG/state_baby_birth_day_11.mp3'],
                                    wait_for: '#',
                                    barge_in: true
                                }
                            }
                        })
                        .run();
                });
            });

            describe("if it is a valid day", function() {
                it("should navigate to state_msg_language", function() {
                    return tester
                        .setup.user.addr('07030010001')
                        .inputs(
                            {session_event: 'new'}
                            , '12345'       // state_personnel_auth
                            , '6'           // state_msg_receiver - friend_only
                            , '09092222222' // state_msisdn
                            , '2'           // state_pregnancy_status - baby
                            , '2'           // state_baby_birth_year - last year
                            , '11'          // state_baby_birth_month - nov
                            , '12'          // state_baby_birth_day
                            , '3'           // state_gravida
                        )
                        .check.interaction({
                            state: 'state_msg_language'
                        })
                        .check.reply.properties({
                            helper_metadata: {
                                voice: {
                                    speech_url: ['http://localhost:8004/api/v1/eng_NG/state_msg_language_1.mp3'],
                                    wait_for: '#',
                                    barge_in: true
                                }
                            }
                        })
                        .run();
                });
            });

            describe("if it is 0", function() {
                it("should restart", function() {
                    return tester
                        .setup.user.addr('07030010001')
                        .inputs(
                            {session_event: 'new'}
                            , '12345'       // state_personnel_auth
                            , '6'           // state_msg_receiver - friend_only
                            , '09092222222' // state_msisdn
                            , '2'           // state_pregnancy_status - baby
                            , '2'           // state_baby_birth_year - last year
                            , '11'          // state_baby_birth_month - nov
                            , '0'           // state_baby_birth_day
                        )
                        .check.interaction({
                            state: 'state_personnel_auth'
                        })
                        .check.reply.properties({
                            helper_metadata: {
                                voice: {
                                    speech_url: ['http://localhost:8004/api/v1/eng_NG/state_personnel_auth_1.mp3'],
                                    wait_for: '#',
                                    barge_in: true
                                }
                            }
                        })
                        .run();
                });
            });
        });

        describe("when you enter a gravida number", function() {
            it("3 - should navigate to state_msg_language", function() {
                return tester
                    .setup.user.addr('07030010001')
                    .inputs(
                        {session_event: 'new'}
                        , '12345'       // state_personnel_auth
                        , '6'           // state_msg_receiver - friend_only
                        , '09092222222' // state_msisdn
                        // , '1'           // state_pregnancy_status - pregnant  // bypass postbirth flow
                        , '2'           // state_last_period_year - last year
                        , '10'          // state_last_period_month - oct
                        , '22'          // state_last_period_day
                        , '3'           // state_gravida
                    )
                    .check.interaction({
                        state: 'state_msg_language'
                    })
                    .check.reply.properties({
                        helper_metadata: {
                            voice: {
                                speech_url: ['http://localhost:8004/api/v1/eng_NG/state_msg_language_1.mp3'],
                                wait_for: '#',
                                barge_in: true
                            }
                        }
                    })
                    .run();
            });
            it("0 - should navigate to state_personnel_auth (restart)", function() {
                return tester
                    .setup.user.addr('07030010001')
                    .inputs(
                        {session_event: 'new'}
                        , '12345'       // state_personnel_auth
                        , '6'           // state_msg_receiver - friend_only
                        , '09092222222' // state_msisdn
                        // , '1'           // state_pregnancy_status - pregnant  // bypass postbirth flow
                        , '2'           // state_last_period_year - last year
                        , '10'          // state_last_period_month - oct
                        , '22'          // state_last_period_day
                        , '0'           // state_gravida
                    )
                    .check.interaction({
                        state: 'state_msg_receiver'
                    })
                    .check.reply.properties({
                        helper_metadata: {
                            voice: {
                                speech_url: ['http://localhost:8004/api/v1/eng_NG/state_msg_receiver_1.mp3'],
                                wait_for: '#',
                                barge_in: true
                            }
                        }
                    })
                    .run();
            });
        });

        describe("When you choose a language state_msg_language", function() {
            it("should navigate to state state_msg_type", function() {
                return tester
                    .setup.user.addr('07030010001')
                    .inputs(
                        {session_event: 'new'}
                        , '12345'       // state_personnel_auth
                        , '6'           // state_msg_receiver - friend_only
                        , '09092222222' // state_msisdn
                        , '2'           // state_pregnancy_status - baby
                        , '2'           // state_baby_birth_year - last year
                        , '11'          // state_baby_birth_month - nov
                        , '13'          // state_baby_birth_day
                        , '2'           // state_gravida
                        , '1'           // state_msg-language - english
                    )
                    .check.interaction({
                        state: 'state_msg_type'
                    })
                    .check.reply.properties({
                            helper_metadata: {
                                voice: {
                                    speech_url: ['http://localhost:8004/api/v1/eng_NG/state_msg_type_1.mp3'],
                                    wait_for: '#',
                                    barge_in: true
                                }
                            }
                        })
                    .run();
            });
        });

        describe("When you choose a channel state_msg_type", function() {
            describe("if you choose sms", function() {
                it("should navigate to state_end_sms", function() {
                    return tester
                        .setup.user.addr('07030010001')
                        .inputs(
                            {session_event: 'new'}
                            , '12345'       // state_personnel_auth
                            , '6'           // state_msg_receiver - friend_only
                            , '09092222222' // state_msisdn
                            // , '2'           // state_pregnancy_status - baby
                            // , '2'           // state_baby_birth_year - last year
                            // , '7'           // state_baby_birth_month - july
                            // , '13'          // state_baby_birth_day
                            , '2'           // state_last_period_year - last year
                            , '12'           // state_last_period_month - dec
                            , '13'          // state_last_period_day

                            , '2'           // state_gravida
                            , '2'           // state_msg_language - igbo
                            , '2'           // state_msg_type - sms
                        )
                        .check.interaction({
                            state: 'state_end_sms'
                        })
                        .check.reply.properties({
                            helper_metadata: {
                                voice: {
                                    speech_url: ['http://localhost:8004/api/v1/eng_NG/state_end_sms_1.mp3'],
                                    wait_for: '#',
                                    barge_in: false
                                }
                            }
                        })
                        .check(function(api) {
                            // var expected_used = [6,36,37,38,52,54,59,69,77,79];
                            var expected_used = [6,36,37,38,54,59,69,77,79,80];
                            var fixts = api.http.fixtures.fixtures;
                            var fixts_used = [];
                            fixts.forEach(function(f, i) {
                                f.uses > 0 ? fixts_used.push(i) : null;
                            });
                            assert.deepEqual(fixts_used, expected_used);
                        })
                        .check(function(api) {
                            var metrics = api.metrics.stores.test_metric_store;
                            assert.deepEqual(metrics['test.voice_registration_test.registrations_started'].values, [1]);
                            assert.deepEqual(metrics['test.voice_registration_test.registrations_completed'].values, [1]);
                            assert.deepEqual(metrics['test.voice_registration_test.time_to_register'].values[0] > 0, true);
                        })
                        .check.reply.ends_session()
                        .run();
                });
            });

            describe("if you choose voice", function() {
                it("should navigate to state_voice_days", function() {
                    return tester
                        .setup.user.addr('07030010001')
                        .inputs(
                            {session_event: 'new'}
                            , '12345'       // state_personnel_auth
                            , '6'           // state_msg_receiver - friend_only
                            , '09092222222' // state_msisdn
                            // , '2'           // state_pregnancy_status - baby
                            // , '2'           // state_baby_birth_year - last year
                            // , '11'          // state_baby_birth_month - nov
                            // , '13'          // state_baby_birth_day
                            , '2'           // state_last_period_year - last year
                            , '11'          // state_last_period_month - nov
                            , '13'          // state_last_period_day

                            , '2'           // state_gravida
                            , '2'           // state_msg_language - igbo
                            , '1'           // state_msg_type - voice
                        )
                        .check.interaction({
                            state: 'state_voice_days'
                        })
                        .check.reply.properties({
                            helper_metadata: {
                                voice: {
                                    speech_url: ['http://localhost:8004/api/v1/eng_NG/state_voice_days_1.mp3'],
                                    wait_for: '#',
                                    barge_in: true
                                }
                            }
                        })
                        .run();
                });
            });
        });

        describe("When you choose a day state_voice_days", function() {
            it("should navigate to state_voice_times", function() {
                return tester
                    .setup.user.addr('07030010001')
                    .inputs(
                        {session_event: 'new'}
                        , '12345'       // state_personnel_auth
                        , '6'           // state_msg_receiver - friend_only
                        , '09092222222' // state_msisdn
                        // , '2'           // state_pregnancy_status - baby
                        // , '2'           // state_baby_birth_year - last year
                        // , '11'          // state_baby_birth_month - nov
                        // , '13'          // state_baby_birth_day
                        , '2'           // state_last_period_year - last year
                        , '11'          // state_last_period_month - nov
                        , '13'          // state_last_period_day

                        , '2'           // state_gravida
                        , '3'           // state_msg-language - pidgin
                        , '1'           // state_msg_type - voice
                        , '1'           // state_voice_days - monday and wednesday
                    )
                    .check.interaction({
                        state: 'state_voice_times'
                    })
                    .check.reply.properties({
                            helper_metadata: {
                                voice: {
                                    speech_url: ['http://localhost:8004/api/v1/eng_NG/state_voice_times_1.mp3'],
                                    wait_for: '#',
                                    barge_in: true
                                }
                            }
                        })
                    .run();
            });
        });

        describe("When you choose a time state_voice_times", function() {
            it("should navigate to state_end_voice", function() {
                return tester
                    .setup.user.addr('07030010001')
                    .inputs(
                        {session_event: 'new'}
                        , '12345'       // state_personnel_auth
                        , '6'           // state_msg_receiver - friend_only
                        , '09092222222' // state_msisdn
                        // , '2'           // state_pregnancy_status - baby
                        // , '2'           // state_baby_birth_year - last year
                        // , '9'           // state_baby_birth_month - sep
                        // , '13'          // state_baby_birth_day
                        , '2'           // state_last_period_year - last year
                        , '12'           // state_last_period_month - dec
                        , '13'          // state_last_period_day

                        , '2'           // state_gravida
                        , '2'           // state_msg_language - igbo
                        , '1'           // state_msg_type - voice
                        , '1'           // state_voice_days - mon_wed
                        , '2'           // state_voice_times - 2_5
                    )
                    .check.interaction({
                        state: 'state_end_voice'
                    })
                    .check.reply.properties({
                        helper_metadata: {
                            voice: {
                                speech_url: ['http://localhost:8004/api/v1/eng_NG/state_end_voice_3.mp3'],
                                wait_for: '#',
                                barge_in: false
                            }
                        }
                    })
                    .check(function(api) {
                        // var expected_used = [6,36,37,38,53,54,59,70,77,79];
                        var expected_used = [6,36,37,38,54,59,70,77,79,81];
                        var fixts = api.http.fixtures.fixtures;
                        var fixts_used = [];
                        fixts.forEach(function(f, i) {
                            f.uses > 0 ? fixts_used.push(i) : null;
                        });
                        assert.deepEqual(fixts_used, expected_used);
                    })
                    .check(function(api) {
                        var metrics = api.metrics.stores.test_metric_store;
                        assert.deepEqual(metrics['test.voice_registration_test.registrations_started'].values, [1]);
                        assert.deepEqual(metrics['test.voice_registration_test.registrations_completed'].values, [1]);
                        assert.deepEqual(metrics['test.voice_registration_test.time_to_register'].values[0] > 0, true);
                    })
                    .check.reply.ends_session()
                    .run();
            });

            it("should navigate to state_end_voice 6-8pm", function() {
                return tester
                    .setup.user.addr('07030010001')
                    .inputs(
                        {session_event: 'new'}
                        , '12345'       // state_personnel_auth
                        , '6'           // state_msg_receiver - friend_only
                        , '09092222222' // state_msisdn
                        // , '2'           // state_pregnancy_status - baby
                        // , '2'           // state_baby_birth_year - last year
                        // , '9'           // state_baby_birth_month - sep
                        // , '13'          // state_baby_birth_day
                        , '2'           // state_last_period_year - last year
                        , '12'           // state_last_period_month - dec
                        , '13'          // state_last_period_day

                        , '2'           // state_gravida
                        , '2'           // state_msg_language - igbo
                        , '1'           // state_msg_type - voice
                        , '1'           // state_voice_days - mon_wed
                        , '3'           // state_voice_times - 2_5
                    )
                    .check.interaction({
                        state: 'state_end_voice'
                    })
                    .check.reply.properties({
                        helper_metadata: {
                            voice: {
                                speech_url: ['http://localhost:8004/api/v1/eng_NG/state_end_voice_5.mp3'],
                                wait_for: '#',
                                barge_in: false
                            }
                        }
                    })
                    .check(function(api) {
                        var expected_used = [6, 36, 37, 38, 54, 59, 77, 79, 90, 91];
                        var fixts = api.http.fixtures.fixtures;
                        var fixts_used = [];
                        fixts.forEach(function(f, i) {
                            f.uses > 0 ? fixts_used.push(i) : null;
                        });
                        assert.deepEqual(fixts_used, expected_used);
                    })
                    .check(function(api) {
                        var metrics = api.metrics.stores.test_metric_store;
                        assert.deepEqual(metrics['test.voice_registration_test.registrations_started'].values, [1]);
                        assert.deepEqual(metrics['test.voice_registration_test.registrations_completed'].values, [1]);
                        assert.deepEqual(metrics['test.voice_registration_test.time_to_register'].values[0] > 0, true);
                    })
                    .check.reply.ends_session()
                    .run();
            });
        });

        describe("Testing month validation function (is_valid_month)", function() {
            it("should return true/false if valid", function() {
                // test data
                var today = moment("2017-05-01");

                var choiceMonths = [
                // a year's range of month choices to represent user choice
                    'jan',
                    'feb',
                    'mar',
                    'apr',
                    'may',
                    'jun',
                    'jul',
                    'aug',
                    'sep',
                    'oct',
                    'nov',
                    'dec'
                ];

                // function call
                var resultsForThisYearPeriod = [];
                var resultsForLastYearPeriod = [];
                var resultsForThisYearBaby = [];
                var resultsForLastYearBaby = [];

                var todayLastYear = today.clone();
                todayLastYear.subtract('year', 1);

                for (var i=0; i<choiceMonths.length; i++) {
                    resultsForThisYearPeriod.push(go.utils_project.is_valid_month(today, today.year(), (i+1).toString(), 10));
                    resultsForLastYearPeriod.push(go.utils_project.is_valid_month(today, todayLastYear.year(), (i+1).toString(), 10));
                    resultsForThisYearBaby.push(go.utils_project.is_valid_month(today, today.year(), (i+1).toString(), 13));
                    resultsForLastYearBaby.push(go.utils_project.is_valid_month(today, todayLastYear.year(), (i+1).toString(), 13));
                }

                // expected results
                assert.equal(resultsForThisYearPeriod.length, 12);
                assert.equal(resultsForThisYearPeriod[0], true);      // jan
                assert.equal(resultsForThisYearPeriod[1], true);      // feb
                assert.equal(resultsForThisYearPeriod[2], true);      // mar
                assert.equal(resultsForThisYearPeriod[3], true);      // apr
                assert.equal(resultsForThisYearPeriod[4], true);      // may
                assert.equal(resultsForThisYearPeriod[5], false);     // jun
                assert.equal(resultsForThisYearPeriod[6], false);     // jul
                assert.equal(resultsForThisYearPeriod[7], false);     // aug
                assert.equal(resultsForThisYearPeriod[8], false);     // sep
                assert.equal(resultsForThisYearPeriod[9], false);     // oct
                assert.equal(resultsForThisYearPeriod[10], false);    // nov
                assert.equal(resultsForThisYearPeriod[11], false);    // dec

                assert.equal(resultsForLastYearPeriod.length, 12);
                assert.equal(resultsForLastYearPeriod[0], false);     // jan
                assert.equal(resultsForLastYearPeriod[1], false);     // feb
                assert.equal(resultsForLastYearPeriod[2], false);     // mar
                assert.equal(resultsForLastYearPeriod[3], false);     // apr
                assert.equal(resultsForLastYearPeriod[4], false);     // may
                assert.equal(resultsForLastYearPeriod[5], false);     // jun
                assert.equal(resultsForLastYearPeriod[6], false);      // jul
                assert.equal(resultsForLastYearPeriod[7], true);      // aug
                assert.equal(resultsForLastYearPeriod[8], true);      // sep
                assert.equal(resultsForLastYearPeriod[9], true);      // oct
                assert.equal(resultsForLastYearPeriod[10], true);     // nov
                assert.equal(resultsForLastYearPeriod[11], true);     // dec

                assert.equal(resultsForThisYearBaby.length, 12);
                assert.equal(resultsForThisYearBaby[0], true);      // jan
                assert.equal(resultsForThisYearBaby[1], true);      // feb
                assert.equal(resultsForThisYearBaby[2], true);      // mar
                assert.equal(resultsForThisYearBaby[3], true);      // apr
                assert.equal(resultsForThisYearBaby[4], true);      // may
                assert.equal(resultsForThisYearBaby[5], false);     // jun
                assert.equal(resultsForThisYearBaby[6], false);     // jul
                assert.equal(resultsForThisYearBaby[7], false);     // aug
                assert.equal(resultsForThisYearBaby[8], false);     // sep
                assert.equal(resultsForThisYearBaby[9], false);     // oct
                assert.equal(resultsForThisYearBaby[10], false);    // nov
                assert.equal(resultsForThisYearBaby[11], false);    // dec

                assert.equal(resultsForLastYearBaby.length, 12);
                assert.equal(resultsForLastYearBaby[0], false);     // jan
                assert.equal(resultsForLastYearBaby[1], false);     // feb
                assert.equal(resultsForLastYearBaby[2], false);     // mar
                assert.equal(resultsForLastYearBaby[3], false);      // apr
                assert.equal(resultsForLastYearBaby[4], true);      // may
                assert.equal(resultsForLastYearBaby[5], true);      // jun
                assert.equal(resultsForLastYearBaby[6], true);      // jul
                assert.equal(resultsForLastYearBaby[7], true);      // aug
                assert.equal(resultsForLastYearBaby[8], true);      // sep
                assert.equal(resultsForLastYearBaby[9], true);      // oct
                assert.equal(resultsForLastYearBaby[10], true);     // nov
                assert.equal(resultsForLastYearBaby[11], true);     // dec

            });
            it("should return true/false if valid - for month of december as boundary case", function() {
                // test data
                var today = moment("2017-12-01");

                var choiceMonths = [
                // a year's range of month choices to represent user choice
                    'jan',
                    'feb',
                    'mar',
                    'apr',
                    'may',
                    'jun',
                    'jul',
                    'aug',
                    'sep',
                    'oct',
                    'nov',
                    'dec'
                ];

                // function call
                var resultsForThisYearPeriod = [];
                var resultsForLastYearPeriod = [];
                var resultsForThisYearBaby = [];
                var resultsForLastYearBaby = [];

                var todayLastYear = today.clone();
                todayLastYear.subtract('year', 1);

                for (var i=0; i<choiceMonths.length; i++) {
                    resultsForThisYearPeriod.push(go.utils_project.is_valid_month(today, today.year(), (i+1).toString(), 10));
                    resultsForLastYearPeriod.push(go.utils_project.is_valid_month(today, todayLastYear.year(), (i+1).toString(), 10));
                    resultsForThisYearBaby.push(go.utils_project.is_valid_month(today, today.year(), (i+1).toString(), 13));
                    resultsForLastYearBaby.push(go.utils_project.is_valid_month(today, todayLastYear.year(), (i+1).toString(), 13));
                }

                // expected results
                assert.equal(resultsForThisYearPeriod.length, 12);
                assert.equal(resultsForThisYearPeriod[0], false);    // jan
                assert.equal(resultsForThisYearPeriod[1], false);     // feb
                assert.equal(resultsForThisYearPeriod[2], true);     // mar
                assert.equal(resultsForThisYearPeriod[3], true);     // apr
                assert.equal(resultsForThisYearPeriod[4], true);     // may
                assert.equal(resultsForThisYearPeriod[5], true);     // jun
                assert.equal(resultsForThisYearPeriod[6], true);     // jul
                assert.equal(resultsForThisYearPeriod[7], true);     // aug
                assert.equal(resultsForThisYearPeriod[8], true);     // sep
                assert.equal(resultsForThisYearPeriod[9], true);     // oct
                assert.equal(resultsForThisYearPeriod[10], true);    // nov
                assert.equal(resultsForThisYearPeriod[11], true);    // dec

                assert.equal(resultsForLastYearPeriod.length, 12);
                assert.equal(resultsForLastYearPeriod[0], false);     // jan
                assert.equal(resultsForLastYearPeriod[1], false);     // feb
                assert.equal(resultsForLastYearPeriod[2], false);     // mar
                assert.equal(resultsForLastYearPeriod[3], false);     // apr
                assert.equal(resultsForLastYearPeriod[4], false);     // may
                assert.equal(resultsForLastYearPeriod[5], false);     // jun
                assert.equal(resultsForLastYearPeriod[6], false);     // jul
                assert.equal(resultsForLastYearPeriod[7], false);     // aug
                assert.equal(resultsForLastYearPeriod[8], false);     // sep
                assert.equal(resultsForLastYearPeriod[9], false);     // oct
                assert.equal(resultsForLastYearPeriod[10], false);    // nov
                assert.equal(resultsForLastYearPeriod[11], false);    // dec

                assert.equal(resultsForThisYearBaby.length, 12);
                assert.equal(resultsForThisYearBaby[0], true);     // jan
                assert.equal(resultsForThisYearBaby[1], true);     // feb
                assert.equal(resultsForThisYearBaby[2], true);     // mar
                assert.equal(resultsForThisYearBaby[3], true);     // apr
                assert.equal(resultsForThisYearBaby[4], true);     // may
                assert.equal(resultsForThisYearBaby[5], true);     // jun
                assert.equal(resultsForThisYearBaby[6], true);     // jul
                assert.equal(resultsForThisYearBaby[7], true);     // aug
                assert.equal(resultsForThisYearBaby[8], true);     // sep
                assert.equal(resultsForThisYearBaby[9], true);     // oct
                assert.equal(resultsForThisYearBaby[10], true);    // nov
                assert.equal(resultsForThisYearBaby[11], true);    // dec

                assert.equal(resultsForLastYearBaby.length, 12);
                assert.equal(resultsForLastYearBaby[0], false);     // jan
                assert.equal(resultsForLastYearBaby[1], false);     // feb
                assert.equal(resultsForLastYearBaby[2], false);     // mar
                assert.equal(resultsForLastYearBaby[3], false);     // apr
                assert.equal(resultsForLastYearBaby[4], false);     // may
                assert.equal(resultsForLastYearBaby[5], false);     // jun
                assert.equal(resultsForLastYearBaby[6], false);     // jul
                assert.equal(resultsForLastYearBaby[7], false);     // aug
                assert.equal(resultsForLastYearBaby[8], false);     // sep
                assert.equal(resultsForLastYearBaby[9], false);     // oct
                assert.equal(resultsForLastYearBaby[10], false);     // nov
                assert.equal(resultsForLastYearBaby[11], true);     // dec

            });
        });

        // TEST CORRECT MSISDN PROMPT

        describe("When you select different receivers *_only", function() {

            describe("when you select mother only", function() {
                it("should use state_msisdn_1", function() {
                    return tester
                        .setup.user.addr('07030010009')
                        .inputs(
                            {session_event: 'new'}
                            , '12345'       // state_personnel_auth
                            , '2'           // state_msg_receiver - mother_only
                        )
                        .check.interaction({
                            state: 'state_msisdn'
                        })
                        .check.reply.properties({
                            helper_metadata: {
                                voice: {
                                    speech_url: ['http://localhost:8004/api/v1/eng_NG/state_msisdn_1.mp3'],
                                    wait_for: '#',
                                    barge_in: true
                                }
                            }
                        })
                        .run();
                });
            });

            describe("when you select family only", function() {
                it("should use state_msisdn_2", function() {
                    return tester
                        .setup.user.addr('07030010009')
                        .inputs(
                            {session_event: 'new'}
                            , '12345'       // state_personnel_auth
                            , '7'           // state_msg_receiver - family_only
                        )
                        .check.interaction({
                            state: 'state_msisdn'
                        })
                        .check.reply.properties({
                            helper_metadata: {
                                voice: {
                                    speech_url: ['http://localhost:8004/api/v1/eng_NG/state_msisdn_2.mp3'],
                                    wait_for: '#',
                                    barge_in: true
                                }
                            }
                        })
                        .run();
                });
            });

            describe("when you select friend only", function() {
                it("should use state_msisdn_3", function() {
                    return tester
                        .setup.user.addr('07030010009')
                        .inputs(
                            {session_event: 'new'}
                            , '12345'       // state_personnel_auth
                            , '6'           // state_msg_receiver - friend_only
                        )
                        .check.interaction({
                            state: 'state_msisdn'
                        })
                        .check.reply.properties({
                            helper_metadata: {
                                voice: {
                                    speech_url: ['http://localhost:8004/api/v1/eng_NG/state_msisdn_3.mp3'],
                                    wait_for: '#',
                                    barge_in: true
                                }
                            }
                        })
                        .run();
                });
            });

            describe("when you select father only", function() {
                it("should use state_msisdn_4", function() {
                    return tester
                        .setup.user.addr('07030010009')
                        .inputs(
                            {session_event: 'new'}
                            , '12345'       // state_personnel_auth
                            , '3'           // state_msg_receiver - father_only
                        )
                        .check.interaction({
                            state: 'state_msisdn'
                        })
                        .check.reply.properties({
                            helper_metadata: {
                                voice: {
                                    speech_url: ['http://localhost:8004/api/v1/eng_NG/state_msisdn_4.mp3'],
                                    wait_for: '#',
                                    barge_in: true
                                }
                            }
                        })
                        .run();
                });
            });
        });
    });
});
