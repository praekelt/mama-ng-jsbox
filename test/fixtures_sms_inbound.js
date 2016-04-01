// 05059992222: registered user - mother only registration, sms, pregnant, igbo

module.exports = function() {
    return [

    // 0: get identity 05059992222 by msisdn
    {
        'repeatable': true,
        'request': {
            'method': 'GET',
            'params': {
                'details__addresses__msisdn': '+2345059992222'
            },
            'headers': {
                'Authorization': ['Token test_key'],
                'Content-Type': ['application/json']
            },
            'url': 'http://localhost:8001/api/v1/identities/search/',
        },
        'response': {
            "code": 200,
            "data": {
                "count": 1,
                "next": null,
                "previous": null,
                "results": [{
                    "url": "http://localhost:8001/api/v1/identities/3f7c8851-5204-43f7-af7f-005059992222/",
                    "id": "3f7c8851-5204-43f7-af7f-005059992222",
                    "version": 1,
                    "details": {
                        "default_addr_type": "msisdn",
                        "addresses": {
                            "msisdn": {
                                "+2345059992222": {}
                            }
                        },
                        "receiver_role": "mother",
                        "linked_to": null,
                        "preferred_msg_type": "text",
                        "preferred_language": "ibo_NG"
                    },
                    "created_at": "2015-07-10T06:13:29.693272Z",
                    "updated_at": "2015-07-10T06:13:29.693298Z"
                }]
            }
        }
    },

    // 1: Optout 05059992222
    {
        'request': {
            'method': 'POST',
            'headers': {
                'Authorization': ['Token test_key'],
                'Content-Type': ['application/json']
            },
            'url': 'http://localhost:8001/api/v1/optout/',
            'data': {
                "optout_type": "stop",
                "identity": "3f7c8851-5204-43f7-af7f-005059992222",
                "reason": "unknown",
                "address_type": "msisdn",
                "address": "+2345059992222",
                "request_source": "sms_inbound",
                "requestor_source_id": "0170b7bb-978e-4b8a-35d2-662af5b6daee"
            }
        },
        'response': {
            'code': 201,
            'data': {
                'id': 1
            }
        }
    },

    // 2: get identity 05059991111 by msisdn - no results
    {
        'request': {
            'method': 'GET',
            'params': {
                'details__addresses__msisdn': '+2345059991111'
            },
            'headers': {
                'Authorization': ['Token test_key'],
                'Content-Type': ['application/json']
            },
            'url': 'http://localhost:8001/api/v1/identities/search/',
        },
        'response': {
            "code": 200,
            "data": {
                "count": 0,
                "next": null,
                "previous": null,
                "results": []
            }
        }
    },

    // 3: post inbound message
    {
        'request': {
            'method': 'POST',
            'params': {},
            'headers': {
                'Authorization': ['Token test_key'],
                'Content-Type': ['application/json']
            },
            'url': 'http://localhost:8006/api/v1/inbound/',
            'data': {
                "message_id": "0170b7bb-978e-4b8a-35d2-662af5b6daee",
                "in_reply_to": null,
                "to_addr": "2341234",
                "from_addr": "05059991111",
                "transport_name": "aggregator_sms",
                "transport_type": "sms",
                "helper_metadata": {}
            }
        },
        'response': {
            "code": 201,
            "data": {}
        }
    },

];
};
