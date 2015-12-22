var vumigo = require('vumigo_v02');
var fixtures = require('./fixtures');
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
                    testing_today: '2015-07-22',
                    name: 'voice-registration-test',
                    control: {
                        url: "http://localhost:8000/api/v1/",
                        api_key: "control_test_key"
                    },
                    voice_content: {
                        url: "http://localhost:8001/api/v1/",
                        api_key: "voice_test_key"
                    },
                    reg_complete_sms:
                        "You have been registered on Hello Mama. Welcome! " +
                        "To change the day & time you receive calls, stop " +
                        "them, or tell us you've had the baby, please call " +
                        "{{ voice_change_num }}.",
                    vumi_http: {
                        url: "https://localhost/api/v1/go/http_api_nostream/conversation_key/messages.json",
                        account_key: "acc_key",
                        conversation_token: "conv_token"
                    }
                })
                .setup(function(api) {
                    fixtures().forEach(function(d) {
                        d.repeatable = true;
                        api.http.fixtures.add(d);
                    });
                })
                ;
        });


        // TEST ANSWER RESET

        describe("When you go back to the main menu", function() {
            it("should reset the user answers", function() {
                return tester
                    .setup.user.addr('+07030010001')
                    .inputs(
                        {session_event: 'new'},
                        '08080020002',
                        '*'
                    )
                    .check.interaction({
                        state: 'state_r01_number',
                        reply: 'Welcome, Number'
                    })
                    .check.user.answers({})
                    .run();
            });
        });

        // TEST REGISTRATION FLOW

        describe("When you start the app", function() {
            it("should navigate to state r01_number", function() {
                return tester
                    .setup.user.addr('+07030010001')
                    .inputs(
                        {session_event: 'new'}
                    )
                    .check.interaction({
                        state: 'state_r01_number',
                        reply: 'Welcome, Number'
                    })
                    .check.reply.properties({
                        helper_metadata: {
                            voice: {
                                speech_url: 'http://localhost:8001/api/v1/eng_NG/state_r01_number_1.mp3',
                                wait_for: '#'
                            }
                        }
                    })
                    .run();
            });
        });

        describe("When you enter a phone number r01_number", function() {
            describe("if the number validates", function() {
                it("should navigate to state r03_receiver", function() {
                    return tester
                        .setup.user.addr('+07030010001')
                        .inputs(
                            {session_event: 'new'},
                            '08080020002'
                        )
                        .check.interaction({
                            state: 'state_r03_receiver',
                            reply: [
                                'Choose receiver',
                                '1. Mother',
                                '2. Other'
                            ].join('\n')
                        })
                        .check.reply.properties({
                            helper_metadata: {
                                voice: {
                                    speech_url: 'http://localhost:8001/api/v1/eng_NG/state_r03_receiver_1.mp3',
                                    wait_for: '#'
                                }
                            }
                        })
                        .run();
                });

                it("should set the user answer mama_id to the mama's id", function() {
                    return tester
                        .setup.user.addr('+07030010001')
                        .inputs(
                            {session_event: 'new'},
                            '08080020002'
                        )
                        .check.user.answer('mama_id',
                            'cb245673-aa41-4302-ac47-00000000002')
                        .run();
                });

                it("should create the contact if it doesn't exist", function() {
                    return tester
                        .setup.user.addr('+07030010001')
                        .inputs(
                            {session_event: 'new'},
                            '08080030003'
                        )
                        .check.user.answer('mama_id',
                            'cb245673-aa41-4302-ac47-00000000003')
                        .run();
                });
            });

            describe("if the number does not validate", function() {
                it("should navigate to state r02_retry_number", function() {
                    return tester
                        .setup.user.addr('+07030010001')
                        .inputs(
                            {session_event: 'new'},
                            '+08080020002'
                        )
                        .check.interaction({
                            state: 'state_r02_retry_number',
                            reply: 'Retry number'
                        })
                        .check.reply.properties({
                            helper_metadata: {
                                voice: {
                                    speech_url: 'http://localhost:8001/api/v1/eng_NG/state_r02_retry_number_1.mp3',
                                    wait_for: '#'
                                }
                            }
                        })
                        .run();
                });
            });

            describe("if the retried number does not validate", function() {
                it("should navigate to state r02_retry_number again", function() {
                    return tester
                        .setup.user.addr('+07030010001')
                        .inputs(
                            {session_event: 'new'},
                            '+08080020002',
                            '+08080020002'
                        )
                        .check.interaction({
                            state: 'state_r02_retry_number',
                            reply: 'Retry number'
                        })
                        .check.reply.properties({
                            helper_metadata: {
                                voice: {
                                    speech_url: 'http://localhost:8001/api/v1/eng_NG/state_r02_retry_number_1.mp3',
                                    wait_for: '#'
                                }
                            }
                        })
                        .run();
                });
            });

            describe("if the user tries to restart with *", function() {
                it("should not restart", function() {
                    return tester
                        .setup.user.addr('+07030010001')
                        .inputs(
                            {session_event: 'new'},
                            '+08080020002',
                            '*'
                        )
                        .check.interaction({
                            state: 'state_r02_retry_number',
                            reply: 'Retry number'
                        })
                        .check.reply.properties({
                            helper_metadata: {
                                voice: {
                                    speech_url: 'http://localhost:8001/api/v1/eng_NG/state_r02_retry_number_1.mp3',
                                    wait_for: '#'
                                }
                            }
                        })
                        .run();
                });
            });

            describe("if the retried number validates", function() {
                it("should navigate to state r03_receiver", function() {
                    return tester
                        .setup.user.addr('+07030010001')
                        .inputs(
                            {session_event: 'new'},
                            '+08080020002',
                            '08080020002'
                        )
                        .check.interaction({
                            state: 'state_r03_receiver',
                            reply: [
                                'Choose receiver',
                                '1. Mother',
                                '2. Other'
                            ].join('\n')
                        })
                        .check.reply.properties({
                            helper_metadata: {
                                voice: {
                                    speech_url: 'http://localhost:8001/api/v1/eng_NG/state_r03_receiver_1.mp3',
                                    wait_for: '#'
                                }
                            }
                        })
                        .run();
                });

                it("should set the user answer mama_id to the mama's id", function() {
                    return tester
                        .setup.user.addr('+07030010001')
                        .inputs(
                            {session_event: 'new'},
                            '+08080020002',
                            '08080020002'
                        )
                        .check.user.answers({
                            mama_id: 'cb245673-aa41-4302-ac47-00000000002',
                            mama_num: '08080020002',
                            state_r01_number: '+08080020002',
                            state_r02_retry_number: '08080020002'
                        })
                        .run();
                });
            });
        });

        describe("When you enter a choice r03_receiver", function() {
            describe("if it is a valid choice", function() {
                it("should navigate to state r04_mom_state", function() {
                    return tester
                        .setup.user.addr('+07030010001')
                        .inputs(
                            {session_event: 'new'},
                            '08080020002'
                            , '1'  // r03_receiver - mother
                        )
                        .check.interaction({
                            state: 'state_r04_mom_state',
                            reply: [
                                'Pregnant or baby',
                                '1. Pregnant',
                                '2. Baby'
                            ].join('\n')
                        })
                        .check.reply.properties({
                            helper_metadata: {
                                voice: {
                                    speech_url: 'http://localhost:8001/api/v1/eng_NG/state_r04_mom_state_1.mp3',
                                    wait_for: '#'
                                }
                            }
                        })
                        .run();
                });
            });

            describe("if it is *", function() {
                it("should restart", function() {
                    return tester
                        .setup.user.addr('+07030010001')
                        .inputs(
                            {session_event: 'new'},
                            '08080020002'
                            , '*'  // r03_receiver - restart
                        )
                        .check.interaction({
                            state: 'state_r01_number',
                            reply: 'Welcome, Number'
                        })
                        .check.reply.properties({
                            helper_metadata: {
                                voice: {
                                    speech_url: 'http://localhost:8001/api/v1/eng_NG/state_r01_number_1.mp3',
                                    wait_for: '#'
                                }
                            }
                    })
                        .run();
                });
            });

            describe("if it is an invalid choice", function() {
                it("should replay r03_receiver", function() {
                    return tester
                        .setup.user.addr('+07030010001')
                        .inputs(
                            {session_event: 'new'},
                            '08080020002'
                            , '7'  // r03_receiver - invalid choice
                        )
                        .check.interaction({
                            state: 'state_r03_receiver',
                            reply: [
                                'Choose receiver',
                                '1. Mother',
                                '2. Other'
                            ].join('\n')
                        })
                        .check.reply.properties({
                            helper_metadata: {
                                voice: {
                                    speech_url: 'http://localhost:8001/api/v1/eng_NG/state_r03_receiver_1.mp3',
                                    wait_for: '#'
                                }
                            }
                        })
                        .run();
                });
            });
        });

        describe("When you enter a choice r04_mom_state", function() {
            describe("if you choose pregnant", function() {
                it("should navigate to state r05_birth_year", function() {
                    return tester
                        .setup.user.addr('+07030010001')
                        .inputs(
                            {session_event: 'new'},
                            '08080020002'
                            , '1'  // r03_receiver - mother
                            , '1'  // r04_mom_state - pregnant
                        )
                        .check.interaction({
                            state: 'state_r05_birth_year',
                            reply: [
                                'Birth year?',
                                '1. this_year',
                                '2. next_year'
                            ].join('\n')
                        })
                        .check.reply.properties({
                            helper_metadata: {
                                voice: {
                                    speech_url: 'http://localhost:8001/api/v1/eng_NG/state_r05_birth_year_1.mp3',
                                    wait_for: '#'
                                }
                            }
                        })
                        .run();
                });
            });

            describe("if you choose baby", function() {
                it("should navigate to state r05_birth_year", function() {
                    return tester
                        .setup.user.addr('+07030010001')
                        .inputs(
                            {session_event: 'new'},
                            '08080020002'
                            , '1'  // r03_receiver - mother
                            , '2'  // r04_mom_state - baby
                        )
                        .check.interaction({
                            state: 'state_r05_birth_year',
                            reply: [
                                'Birth year?',
                                '1. last_year',
                                '2. this_year'
                            ].join('\n')
                        })
                        .check.reply.properties({
                            helper_metadata: {
                                voice: {
                                    speech_url: 'http://localhost:8001/api/v1/eng_NG/state_r05_birth_year_2.mp3',
                                    wait_for: '#'
                                }
                            }
                        })
                        .run();
                });
            });
        });

        describe("When you enter a choice r05_birth_year", function() {
            describe("if the mother is pregnant", function() {
                it("should navigate to state r06_birth_month", function() {
                    return tester
                        .setup.user.addr('+07030010001')
                        .inputs(
                            {session_event: 'new'},
                            '08080020002'
                            , '1'  // r03_receiver - mother
                            , '1'  // r04_mom_state - pregnant
                            , '1'  // r05_birth_year - this year
                        )
                        .check.interaction({
                            state: 'state_r06_birth_month',
                            reply: [
                                'Birth month? 1-12',
                                '1. 1', '2. 2', '3. 3', '4. 4', '5. 5', '6. 6',
                                '7. 7', '8. 8', '9. 9', '10. 10', '11. 11',
                                '12. 12'
                            ].join('\n')
                        })
                        .check.reply.properties({
                            helper_metadata: {
                                voice: {
                                    speech_url: 'http://localhost:8001/api/v1/eng_NG/state_r06_birth_month_1.mp3',
                                    wait_for: '#'
                                }
                            }
                        })
                        .run();
                });
            });

            describe("if the mother has had her baby", function() {
                it("should navigate to state r06_birth_month", function() {
                    return tester
                        .setup.user.addr('+07030010001')
                        .inputs(
                            {session_event: 'new'},
                            '08080020002'
                            , '1'  // r03_receiver - mother
                            , '2'  // r04_mom_state - baby
                            , '1'  // r05_birth_year - last year
                        )
                        .check.interaction({
                            state: 'state_r06_birth_month',
                            reply: [
                                'Birth month? 1-12',
                                '1. 1', '2. 2', '3. 3', '4. 4', '5. 5', '6. 6',
                                '7. 7', '8. 8', '9. 9', '10. 10', '11. 11',
                                '12. 12'
                            ].join('\n')
                        })
                        .check.reply.properties({
                            helper_metadata: {
                                voice: {
                                    speech_url: 'http://localhost:8001/api/v1/eng_NG/state_r06_birth_month_2.mp3',
                                    wait_for: '#'
                                }
                            }
                        })
                        .run();
                });
            });
        });

        describe("When you enter a choice r06_birth_month", function() {
            it("should ask for month confirmation r07_confirm_month", function() {
                return tester
                    .setup.user.addr('+07030010001')
                    .inputs(
                        {session_event: 'new'},
                        '08080020002'
                        , '1'  // r03_receiver - mother
                        , '1'  // r04_mom_state - pregnant
                        , '1'  // r05_birth_year - this year
                        , '6'  // r06_birth_month - june
                    )
                    .check.interaction({
                        state: 'state_r07_confirm_month',
                        reply: [
                            'You entered x for Month. Correct?',
                            '1. confirm',
                            '2. retry'
                        ].join('\n')
                    })
                    .check.reply.properties({
                        helper_metadata: {
                            voice: {
                                speech_url: 'http://localhost:8001/api/v1/eng_NG/state_r07_confirm_month_6.mp3',
                                wait_for: '#'
                            }
                        }
                    })
                    .run();
            });
        });

        describe("When you enter a choice r07_confirm_month", function() {
            describe("if the mother is pregnant", function() {
                describe("if you select retry", function() {
                    it("should navigate to state r06_birth_month again", function() {
                        return tester
                            .setup.user.addr('+07030010001')
                            .inputs(
                                {session_event: 'new'},
                                '08080020002'
                                , '1'  // r03_receiver - mother
                                , '1'  // r04_mom_state - pregnant
                                , '1'  // r05_birth_year - this year
                                , '6'  // r06_birth_month - june
                                , '2'  // r07_confirm_month - retry
                            )
                            .check.interaction({
                                state: 'state_r06_birth_month',
                                reply: [
                                    'Birth month? 1-12',
                                    '1. 1', '2. 2', '3. 3', '4. 4', '5. 5', '6. 6',
                                    '7. 7', '8. 8', '9. 9', '10. 10', '11. 11',
                                    '12. 12'
                                ].join('\n')
                            })
                            .check.reply.properties({
                                helper_metadata: {
                                    voice: {
                                        speech_url: 'http://localhost:8001/api/v1/eng_NG/state_r06_birth_month_1.mp3',
                                        wait_for: '#'
                                    }
                                }
                            })
                            .run();
                    });
                });

                describe("if you select confirm", function() {
                    it("should navigate to state r08_birth_day", function() {
                        return tester
                            .setup.user.addr('+07030010001')
                            .inputs(
                                {session_event: 'new'},
                                '08080020002'
                                , '1'  // r03_receiver - mother
                                , '1'  // r04_mom_state - pregnant
                                , '1'  // r05_birth_year - this year
                                , '6'  // r06_birth_month - june
                                , '1'  // r07_confirm_month - confirm
                            )
                            .check.interaction({
                                state: 'state_r08_birth_day',
                                reply: 'Birth day in 6?'
                            })
                            .check.reply.properties({
                                helper_metadata: {
                                    voice: {
                                        speech_url: 'http://localhost:8001/api/v1/eng_NG/state_r08_birth_day_6.mp3',
                                        wait_for: '#'
                                    }
                                }
                            })
                            .run();
                    });
                });
            });

            describe("if the mother has had her baby", function() {
                describe("if you select retry", function() {
                    it("should navigate to state r06_birth_month again", function() {
                        return tester
                            .setup.user.addr('+07030010001')
                            .inputs(
                                {session_event: 'new'},
                                '08080020002'
                                , '1'  // r03_receiver - mother
                                , '2'  // r04_mom_state - baby
                                , '1'  // r05_birth_year - last year
                                , '11'  // r06_birth_month - november
                                , '2'  // r07_confirm_month - retry
                            )
                            .check.interaction({
                                state: 'state_r06_birth_month',
                                reply: [
                                    'Birth month? 1-12',
                                    '1. 1', '2. 2', '3. 3', '4. 4', '5. 5', '6. 6',
                                    '7. 7', '8. 8', '9. 9', '10. 10', '11. 11',
                                    '12. 12'
                                ].join('\n')
                            })
                            .check.reply.properties({
                                helper_metadata: {
                                    voice: {
                                        speech_url: 'http://localhost:8001/api/v1/eng_NG/state_r06_birth_month_2.mp3',
                                        wait_for: '#'
                                    }
                                }
                            })
                            .run();
                    });
                });

                describe("if you select confirm", function() {
                    it("should navigate to state r08_birth_day", function() {
                        return tester
                            .setup.user.addr('+07030010001')
                            .inputs(
                                {session_event: 'new'},
                                '08080020002'
                                , '1'  // r03_receiver - mother
                                , '2'  // r04_mom_state - baby
                                , '1'  // r05_birth_year - last year
                                , '11'  // r06_birth_month - november
                                , '1'  // r07_confirm_month - confirm
                            )
                            .check.interaction({
                                state: 'state_r08_birth_day',
                                reply: 'Birth day in 11?'
                            })
                            .check.reply.properties({
                                helper_metadata: {
                                    voice: {
                                        speech_url: 'http://localhost:8001/api/v1/eng_NG/state_r08_birth_day_23.mp3',
                                        wait_for: '#'
                                    }
                                }
                            })
                            .run();
                    });

                    it("should navigate to state r08_birth_day", function() {
                        return tester
                            .setup.user.addr('+07030010001')
                            .inputs(
                                {session_event: 'new'},
                                '08080020002'
                                , '1'  // r03_receiver - mother
                                , '2'  // r04_mom_state - baby
                                , '2'  // r05_birth_year - this year
                                , '12'  // r06_birth_month - december
                                , '1'  // r07_confirm_month - confirm
                            )
                            .check.interaction({
                                state: 'state_r08_birth_day',
                                reply: 'Birth day in 12?'
                            })
                            .check.reply.properties({
                                helper_metadata: {
                                    voice: {
                                        speech_url: 'http://localhost:8001/api/v1/eng_NG/state_r08_birth_day_36.mp3',
                                        wait_for: '#'
                                    }
                                }
                            })
                            .run();
                    });
                });
            });
        });


        describe("when you enter a birth day r08_birth_day", function() {
            describe("if it is an invalid day", function() {
                it("should navigate to state_r14_retry_birth_day", function() {
                    return tester
                        .setup.user.addr('+07030010001')
                        .inputs(
                            {session_event: 'new'},
                            '08080020002'
                            , '1'  // r03_receiver - mother
                            , '2'  // r04_mom_state - baby
                            , '2'  // r05_birth_year - this year
                            , '12'  // r06_birth_month - december
                            , '1'  // r07_confirm_month - confirm
                            , '32'  // r08_birth_day - 32nd
                        )
                        .check.interaction({
                            state: 'state_r14_retry_birth_day',
                            reply: 'Retry birth day'
                        })
                        .check.reply.properties({
                            helper_metadata: {
                                voice: {
                                    speech_url: 'http://localhost:8001/api/v1/eng_NG/state_r14_retry_birth_day_1.mp3',
                                    wait_for: '#'
                                }
                            }
                        })
                        .run();
                });
            });

            describe("if it is a valid day", function() {
                it("should navigate to state r09_language", function() {
                    return tester
                        .setup.user.addr('+07030010001')
                        .inputs(
                            {session_event: 'new'},
                            '08080020002'
                            , '1'  // r03_receiver - mother
                            , '2'  // r04_mom_state - baby
                            , '2'  // r05_birth_year - this year
                            , '12'  // r06_birth_month - december
                            , '1'  // r07_confirm_month - confirm
                            , '21'  // r08_birth_day - 21st
                        )
                        .check.interaction({
                            state: 'state_r09_language',
                            reply: [
                                'Language?',
                                '1. english',
                                '2. hausa',
                                '3. igbo'
                            ].join('\n')
                        })
                        .check.reply.properties({
                            helper_metadata: {
                                voice: {
                                    speech_url: 'http://localhost:8001/api/v1/eng_NG/state_r09_language_1.mp3',
                                    wait_for: '#'
                                }
                            }
                        })
                        .run();
                });
            });

            describe("if it is *", function() {
                it("should restart", function() {
                    return tester
                        .setup.user.addr('+07030010001')
                        .inputs(
                            {session_event: 'new'},
                            '08080020002'
                            , '1'  // r03_receiver - mother
                            , '2'  // r04_mom_state - baby
                            , '2'  // r05_birth_year - this year
                            , '12'  // r06_birth_month - december
                            , '1'  // r07_confirm_month - confirm
                            , '*'  // r08_birth_day - restart
                        )
                        .check.interaction({
                            state: 'state_r01_number'
                        })
                        .check.reply.properties({
                            helper_metadata: {
                                voice: {
                                    speech_url: 'http://localhost:8001/api/v1/eng_NG/state_r01_number_1.mp3',
                                    wait_for: '#'
                                }
                            }
                        })
                        .run();
                });
            });
        });

        describe("when you enter a birth day r08_birth_day", function() {
            describe("if it is an invalid day", function() {
                it("should navigate to state_r14_retry_birth_day again", function() {
                    return tester
                        .setup.user.addr('+07030010001')
                        .inputs(
                            {session_event: 'new'},
                            '08080020002'
                            , '1'  // r03_receiver - mother
                            , '2'  // r04_mom_state - baby
                            , '2'  // r05_birth_year - this year
                            , '12'  // r06_birth_month - december
                            , '1'  // r07_confirm_month - confirm
                            , '32'  // r08_birth_day - 32nd
                            , '55'  // r14_retry_birth_day - 55th
                        )
                        .check.interaction({
                            state: 'state_r14_retry_birth_day',
                            reply: 'Retry birth day'
                        })
                        .check.reply.properties({
                            helper_metadata: {
                                voice: {
                                    speech_url: 'http://localhost:8001/api/v1/eng_NG/state_r14_retry_birth_day_1.mp3',
                                    wait_for: '#'
                                }
                            }
                        })
                        .run();
                });
            });

            describe("if it is a valid day", function() {
                it("should navigate to state r09_language", function() {
                    return tester
                        .setup.user.addr('+07030010001')
                        .inputs(
                            {session_event: 'new'},
                            '08080020002'
                            , '1'  // r03_receiver - mother
                            , '2'  // r04_mom_state - baby
                            , '2'  // r05_birth_year - this year
                            , '12'  // r06_birth_month - december
                            , '1'  // r07_confirm_month - confirm
                            , '32'  // r08_birth_day - 32nd
                            , '21'  // r14_retry_birth_day - 21st
                        )
                        .check.interaction({
                            state: 'state_r09_language',
                            reply: [
                                'Language?',
                                '1. english',
                                '2. hausa',
                                '3. igbo'
                            ].join('\n')
                        })
                        .check.reply.properties({
                            helper_metadata: {
                                voice: {
                                    speech_url: 'http://localhost:8001/api/v1/eng_NG/state_r09_language_1.mp3',
                                    wait_for: '#'
                                }
                            }
                        })
                        .run();
                });
            });
        });

        describe("When you choose a language r09_language", function() {
            it("should navigate to state r10_message_type", function() {
                return tester
                    .setup.user.addr('+07030010001')
                    .inputs(
                        {session_event: 'new'},
                        '08080020002'
                        , '1'  // r03_receiver - mother
                        , '2'  // r04_mom_state - baby
                        , '2'  // r05_birth_year - this year
                        , '12'  // r06_birth_month - december
                        , '1'  // r07_confirm_month - confirm
                        , '21'  // r08_birth_day - 21st
                        , '1'  // r09_language - english
                    )
                    .check.interaction({
                        state: 'state_r10_message_type',
                        reply: [
                            'Channel?',
                            '1. sms',
                            '2. voice'
                        ].join('\n')
                    })
                    .check.reply.properties({
                            helper_metadata: {
                                voice: {
                                    speech_url: 'http://localhost:8001/api/v1/eng_NG/state_r10_message_type_1.mp3',
                                    wait_for: '#'
                                }
                            }
                        })
                    .run();
            });
        });

        describe("When you choose a channel r10_message_type", function() {
            describe("if you choose sms", function() {
                it("should navigate to state r13_end", function() {
                    return tester
                        .setup.user.addr('+07030010001')
                        .inputs(
                            {session_event: 'new'},
                            '08080020002'
                            , '2'  // r03_receiver - other
                            , '1'  // r04_mom_state - pregnant
                            , '2'  // r05_birth_year - next year
                            , '2'  // r06_birth_month - february
                            , '1'  // r07_confirm_month - confirm
                            , '27'  // r08_birth_day - 27th
                            , '1'  // r09_language - english
                            , '1'  // r10_message_type - sms
                        )
                        .check.interaction({
                            state: 'state_r13_end',
                            reply: 'Thank you!'
                        })
                        .check.reply.properties({
                            helper_metadata: {
                                voice: {
                                    speech_url: 'http://localhost:8001/api/v1/eng_NG/state_r13_end_1.mp3',
                                    wait_for: '#'
                                }
                            }
                        })
                        .check.reply.ends_session()
                        .run();
                });
            });

            describe("if you choose voice", function() {
                it("should navigate to state r11_voice_days", function() {
                    return tester
                        .setup.user.addr('+07030010001')
                        .inputs(
                            {session_event: 'new'},
                            '08080020002'
                            , '1'  // r03_receiver - mother
                            , '2'  // r04_mom_state - baby
                            , '2'  // r05_birth_year - this year
                            , '12'  // r06_birth_month - december
                            , '1'  // r07_confirm_month - confirm
                            , '21'  // r08_birth_day - 21st
                            , '1'  // r09_language - english
                            , '2'  // r10_message_type - voice
                        )
                        .check.interaction({
                            state: 'state_r11_voice_days',
                            reply: [
                                'Message days?',
                                '1. mon_wed',
                                '2. tue_thu'
                            ].join('\n')
                        })
                        .check.reply.properties({
                            helper_metadata: {
                                voice: {
                                    speech_url: 'http://localhost:8001/api/v1/eng_NG/state_r11_voice_days_1.mp3',
                                    wait_for: '#'
                                }
                            }
                        })
                        .run();
                });
            });
        });

        describe("When you choose a day r11_voice_days", function() {
            it("should navigate to state r12_voice_times", function() {
                return tester
                    .setup.user.addr('+07030010001')
                    .inputs(
                        {session_event: 'new'},
                        '08080020002'
                        , '1'  // r03_receiver - mother
                        , '2'  // r04_mom_state - baby
                        , '2'  // r05_birth_year - this year
                        , '12'  // r06_birth_month - december
                        , '1'  // r07_confirm_month - confirm
                        , '21'  // r08_birth_day - 21st
                        , '1'  // r09_language - english
                        , '2'  // r10_message_type - voice
                        , '1'  // r11_voice_days - mon_wed
                    )
                    .check.interaction({
                        state: 'state_r12_voice_times',
                        reply: [
                            'Message time?',
                            '1. 9_11',
                            '2. 2_5'
                        ].join('\n')
                    })
                    .check.reply.properties({
                            helper_metadata: {
                                voice: {
                                    speech_url: 'http://localhost:8001/api/v1/eng_NG/state_r12_voice_times_1.mp3',
                                    wait_for: '#'
                                }
                            }
                        })
                    .run();
            });
        });

        describe("When you choose a time r12_voice_times", function() {
            it("should navigate to state r13_end", function() {
                return tester
                    .setup.user.addr('+07030010001')
                    .inputs(
                        {session_event: 'new'},
                        '08080020002'
                        , '1'  // r03_receiver - mother
                        , '2'  // r04_mom_state - baby
                        , '2'  // r05_birth_year - this year
                        , '12'  // r06_birth_month - december
                        , '1'  // r07_confirm_month - confirm
                        , '21'  // r08_birth_day - 21st
                        , '1'  // r09_language - english
                        , '2'  // r10_message_type - voice
                        , '1'  // r11_voice_days - mon_wed
                        , '2'  // r12_voice_times - 2_5
                    )
                    .check.interaction({
                        state: 'state_r13_end',
                        reply: 'Thank you! Time: 2_5. Days: mon_wed.'
                    })
                    .check.reply.properties({
                            helper_metadata: {
                                voice: {
                                    speech_url: 'http://localhost:8001/api/v1/eng_NG/state_r13_end_4.mp3',
                                    wait_for: '#'
                                }
                            }
                        })
                    .check.reply.ends_session()
                    .run();
            });

            it("should have the correct answers set", function() {
                return tester
                    .setup.user.addr('+07030010001')
                    .inputs(
                        {session_event: 'new'},
                        '08080020002'
                        , '1'  // r03_receiver - mother
                        , '2'  // r04_mom_state - baby
                        , '2'  // r05_birth_year - this year
                        , '12'  // r06_birth_month - december
                        , '1'  // r07_confirm_month - confirm
                        , '21'  // r08_birth_day - 21st
                        , '1'  // r09_language - english
                        , '2'  // r10_message_type - voice
                        , '1'  // r11_voice_days - mon_wed
                        , '2'  // r12_voice_times - 2_5
                    )
                    .check.user.answers({
                        mama_id: "cb245673-aa41-4302-ac47-00000000002",
                        mama_num: "08080020002",
                        birth_date: '2015-12-21',
                        state_r01_number: "08080020002",
                        state_r03_receiver: "mother",
                        state_r04_mom_state: "baby",
                        state_r05_birth_year: "this_year",
                        state_r06_birth_month: "12",
                        state_r07_confirm_month: "confirm",
                        state_r08_birth_day: "21",
                        state_r09_language: "english",
                        state_r10_message_type: "voice",
                        state_r11_voice_days: "mon_wed",
                        state_r12_voice_times: "2_5"
                    })
                    .run();
            });
        });

    });
});