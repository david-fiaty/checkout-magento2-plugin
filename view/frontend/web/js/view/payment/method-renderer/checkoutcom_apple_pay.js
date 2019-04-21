define([
        'jquery',
        'Magento_Checkout/js/view/payment/default',
        'CheckoutCom_Magento2/js/view/payment/utilities',
        'Magento_Checkout/js/model/full-screen-loader',
        'Magento_Checkout/js/model/payment/additional-validators',
        'mage/translate'
    ],
    function ($, Component, Utilities, FullScreenLoader, AdditionalValidators, __) {

        'use strict';

        window.checkoutConfig.reloadOnBillingAddress = true; // Fix billing address missing.

        const METHOD_ID = 'checkoutcom_applepay';

        return Component.extend(
            {
                defaults: {
                    template: 'CheckoutCom_Magento2/payment/' + METHOD_ID + '.phtml',
                    button_target: '#ckoApplePayButton',
                },

                /**
                 * @returns {exports}
                 */
                initialize: function () {
                    this._super();

                    return this;
                },

                /**
                 * Methods
                 */

                /**
                 * @returns {string}
                 */
                getCode: function () {
                    return METHOD_ID;
                },

                /**
                 * @returns {string}
                 */
                getValue: function (field) {
                    return Utilities.getValue(METHOD_ID, field);
                },

                /**
                 * Apple Pay
                 */

                /**
                 * @returns {array}
                 */
                getLineItems: function() {
                    return [];
                },

                /**
                 * @returns {array}
                 */
                getSupportedNetworks: function() {
                    return this.getValue('supportedNetworks').split(',');
                },

                /**
                 * @returns {array}
                 */
                getSupportedCountries: function() {
                    return this.getValue('supportedCountries').split(',');
                },

                /**
                 * @returns {array}
                 */
                getMerchantCapabilities: function() {
                    var output = ['supports3DS'];
                    var capabilities = this.getValue('merchantCapabilities').split(',');
                    
                    return output.concat(capabilities);
                },

                /**
                 * @returns {object}
                 */
                performValidation: function(valURL) {
                    var controllerUrl = Utilities.getUrl('applepay/validation');
                    var validationUrl = controllerUrl + '?u=' + valURL + '&method_id=' + METHOD_ID;
                    
                    return new Promise(function(resolve, reject) {
                        var xhr = new XMLHttpRequest();
                        xhr.onload = function() {
                            var data = JSON.parse(this.responseText);
                            resolve(data);
                        };
                        xhr.onerror = reject;
                        xhr.open('GET', validationUrl);
                        xhr.send();
                    });
                },

                /**
                 * @returns {object}
                 */
                sendChargeRequest: function(paymentData) {
                    return new Promise(function(resolve, reject) {
                        $.ajax({
                            url: url.build('payment/placeorder'),
                            type: "POST",
                            data: paymentData,
                            success: function(data, textStatus, xhr) {
                                if (data.status === true) {
                                    resolve(data.status);
                                }
                                else {
                                    reject;
                                }
                            },
                            error: function(xhr, textStatus, error) {
                                reject;
                            } 
                        });
                    });
                },

                /**
                 * @returns {bool}
                 */
                launchApplePay: function() {
                    // Prepare the parameters
                    var self = this;

                    // Set the debug mode
                    //self.debug = JSON.parse(ap['debugMode']);

                    // Apply the button style
                    $(self.button_target)
                    .addClass('apple-pay-button-' + self.getValue('button_style'));

                    // Check if the session is available
                    if (window.ApplePaySession) {
                        var merchantIdentifier = self.getValue('merchant_id');
                        var promise = ApplePaySession.canMakePaymentsWithActiveCard(merchantIdentifier);
                        promise.then(function (canMakePayments) {
                            if (canMakePayments) {
                                $(self.button_target).css('display', 'block');
                            } else {   
                                $('#got_notactive').css('display', 'block');
                            }
                        });
                    } else {
                        $('#notgot').css('display', 'block');
                    }

                    // Handle the events
                    $(self.button_target).click(function(evt) {
                        // Validate T&C submission
                        if (!additionalValidators.validate()) {
                            return;
                        }

                        // Prepare the parameters
                        var runningTotal	     = Utilities.getQuoteValue();
                        var billingAddress       = Utilities.getBillingAddress();

                        // Build the payment request
                        var paymentRequest = {
                            currencyCode: Utilities.getQuoteCurrency(),
                            countryCode: billingAddress.countryId,
                            total: {
                                label: Utilities.getStoreName(),
                                amount: runningTotal
                            },
                            supportedNetworks: self.getSupportedNetworks(),
                            merchantCapabilities: self.getMerchantCapabilities(),
                            supportedCountries: self.getSupportedCountries()
                        };

                        // Start the payment session
                        var session = new ApplePaySession(1, paymentRequest);

                        // Merchant Validation
                        session.onvalidatemerchant = function (event) {
                            var promise = self.performValidation(event.validationURL);
                            promise.then(function (merchantSession) {
                                session.completeMerchantValidation(merchantSession);
                            }); 
                        }

                        // Shipping contact
                        session.onshippingcontactselected = function(event) {  
                            var status = ApplePaySession.STATUS_SUCCESS;

                            // Shipping info
                            var shippingOptions = [];                   
                            
                            var newTotal = {
                                type: 'final',
                                label: ap['storeName'],
                                amount: runningTotal
                            };
                            
                            session.completeShippingContactSelection(status, shippingOptions, newTotal, self.getLineItems());
                        }

                        // Shipping method selection
                        session.onshippingmethodselected = function(event) {   
                            var status = ApplePaySession.STATUS_SUCCESS;
                            var newTotal = {
                                type: 'final',
                                label: ap['storeName'],
                                amount: runningTotal
                            };

                            session.completeShippingMethodSelection(status, newTotal, self.getLineItems());
                        }

                        // Payment method selection
                        session.onpaymentmethodselected = function(event) {
                            var newTotal = {
                                type: 'final',
                                label: Utilities.getStoreName(),
                                amount: runningTotal
                            };
                            
                            session.completePaymentMethodSelection(newTotal, self.getLineItems());
                        }

                        // Payment method authorization
                        session.onpaymentauthorized = function (event) {
                            var promise = self.sendChargeRequest(event.payment.token);
                            promise.then(function (success) {	
                                var status;
                                if (success) {
                                    status = ApplePaySession.STATUS_SUCCESS;
                                } else {
                                    status = ApplePaySession.STATUS_FAILURE;
                                }
                                
                                session.completePayment(status);

                                if (success) {
                                    // redirect to success page
                                    FullScreenLoader.startLoader();
                                    redirectOnSuccessAction.execute(); 
                                }
                            });
                        }

                        // Session cancellation
                        session.oncancel = function(event) {
                            self.logEvent(event);
                        }

                        // Begin session
                        session.begin();
                    });
                },

                /**
                 * Events
                 */

                /**
                 * @returns {string}
                 */
                beforePlaceOrder: function () {
                    // Start the loader
                    FullScreenLoader.startLoader();

                    // Validate before submission
                    if (AdditionalValidators.validate()) {
                        // Submission logic

                    } else {
                        FullScreenLoader.stopLoader();
                    }
                }
            }
        );
    }
);