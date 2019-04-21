define([
        'jquery',
        'CheckoutCom_Magento2/js/view/payment/config-loader',
        'Magento_Checkout/js/model/quote',
        'Magento_Checkout/js/checkout-data',
        'mage/url',
        'Magento_Checkout/js/action/redirect-on-success',
        'Magento_Checkout/js/model/full-screen-loader',
        'mage/cookies',
    ],
    function ($, Config, Quote, CheckoutData, Url, RedirectOnSuccessAction, FullScreenLoader) {
        'use strict';

        const KEY_CONFIG = 'checkoutcom_configuration';

        return {

            /**
             * Gets a field value.
             *
             * @param      {string}  methodId The method id
             * @param      {string}  field    The field
             * @return     {mixed}            The value
             */
            getValue: function(methodId, field) { 
                var val = null;
                if (Config.hasOwnProperty(methodId) && Config[methodId].hasOwnProperty(field)) {
                    val = Config[methodId][field]
                }
                else if (Config.hasOwnProperty(KEY_CONFIG) && Config[KEY_CONFIG].hasOwnProperty(field)) {
                    val = Config[KEY_CONFIG][field];
                }

                return val;
            },

            getStoreName: function() {
                return Config[KEY_CONFIG].store.name;
            },

            getQuoteValue: function() {
                return Config[KEY_CONFIG].quote.value;
            },

            getQuoteCurrency: function() {
                return Config[KEY_CONFIG].quote.currency;
            },

            /**
             * Builds the controller URL.
             *
             * @param      {string}  path  The path
             * @return     {string}
             */
            getUrl: function(path) {
                return Url.build('checkout_com/' + path);
            },

            /**
             * Customer name.
             *
             * @param      {bool} return in object format.
             * @return     {mixed}  The billing address.
             */
            getCustomerName: function(obj = false) {
                var billingAddress = Quote.billingAddress(),
                    name = {
                        first_name: billingAddress.firstname,
                        last_name: billingAddress.lastname
                    };


                if(!obj) {
                    name = name.first_name + ' ' + name.last_name
                }

                return name;

            },

            /**
             * Billing address.
             *
             * @return     {object}  The billing address.
             */
            getBillingAddress: function() {
                return Quote.billingAddress();
            },

            /**
             * @returns {string}
             */
            getEmail: function () {
                return window.checkoutConfig.customerData.email || Quote.guestEmail || CheckoutData.getValidatedEmailValue();
            },

            /**
             * @returns {object}
             */
            getPhone: function () {
                var billingAddress = Quote.billingAddress();

                return {
                    number: billingAddress.telephone
                };
            },

            /**
             * Methods
             */

            /**
             * Show a message
             */
            showMessage: function (type, message) {
                this.clearMessages();
                var messageContainer = $('.message');
                messageContainer.addClass('message-' + type + ' ' + type);
                messageContainer.append('<div>' + message + '</div>');
                messageContainer.show();
            },

            /**
             * Clear all messages
             */
            clearMessages: function () {
                var messageContainer = $('.message');
                messageContainer.hide();
                messageContainer.empty();
            },

            /**
             * HTTP handlers
             */

            /**
             * Place a new order.
             * @returns {void}
             */
            placeOrder: function (payload) {
                var self = this;

                // Start the loader
                FullScreenLoader.startLoader();
                
                // Send the request
                $.ajax({
                    type: 'POST',
                    url: self.getUrl('payment/placeorder'),
                    data: payload,
                    success: function (data) {
                        if (!data.success) {
                            FullScreenLoader.stopLoader();
                            self.showMessage('error', data.message);
                        }
                        else {
                            RedirectOnSuccessAction.execute();
                        }
                    },
                    error: function (request, status, error) {
                        FullScreenLoader.stopLoader();
                        self.showMessage('error', error);
                    }
                });
            }
        };
    }
);