define([
        'jquery',
        'Magento_Checkout/js/view/payment/default',
        'CheckoutCom_Magento2/js/view/payment/utilities',
        'Magento_Checkout/js/model/full-screen-loader',
        'Magento_Checkout/js/model/payment/additional-validators',
        'framesjs'
    ],
    function ($, Component, Utilities, FullScreenLoader, AdditionalValidators) {

        'use strict';

        // Fix billing address missing.
        window.checkoutConfig.reloadOnBillingAddress = true;

        const METHOD_ID = 'checkoutcom_card_payment';

        return Component.extend({
            defaults: {
                template: 'CheckoutCom_Magento2/payment/' + METHOD_ID + '.phtml',
                buttonId: METHOD_ID + '_btn',
                formId: METHOD_ID + '_frm'
            },

            /**
             * @returns {exports}
             */
            initialize: function () {
                this._super();
            },

            /**
             * Getters and setters
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
            getValue: function(field) {
                return Utilities.getValue(METHOD_ID, field);
            },

            /**
             * @returns {boolean}
             */
            isAvailable: function () {
                return true;
            },

            /**
             * @returns {boolean}
             */
            isPlaceOrderActionAllowed: function () {
                return true;
            },

            /**
             * @returns {boolean}
             */
            cleanEvents: function () {
                Frames.removeAllEventHandlers(Frames.Events.CARD_VALIDATION_CHANGED);
                Frames.removeAllEventHandlers(Frames.Events.CARD_TOKENISED);
                Frames.removeAllEventHandlers(Frames.Events.FRAME_ACTIVATED);
            },

            /**
             * Events
             */

            /**
             * Gets the payment form
             *
             * @return {void}
             */
            getPaymentForm: function() {                    
                var self = this;

                // Disable button
                Utilities.setButtonState(this.buttonId, false);

                // Remove any existing event handlers
                this.cleanEvents();

                Frames.init({
                    publicKey: self.getValue('public_key'),
                    containerSelector: '.frames-container',
                    debugMode: self.getValue('debug'),
                    //localisation: self.getValue('localisation'),
                    //localisation: 'EN-GB',
                    frameActivated: function () {
                        // Disable button
                        Utilities.setButtonState(this.buttonId, false);
                    },
                    cardValidationChanged: function() {
                        if (Frames.isCardValid() && Utilities.getBillingAddress() != null) {
                            Utilities.setButtonState(this.buttonId, true);
                            Frames.submitCard();
                        }
                    },
                    cardTokenised: function(event) {
                        alert(event.data.cardToken);
                        Frames.addCardToken(
                            document.getElementById(self.formId),
                            event.data.cardToken
                        );
                    }
                });
            },

            /**
             * @returns {void}
             */
            placeOrder: function () {
                if (AdditionalValidators.validate() && Frames.isCardValid()) {
                    Utilities.placeOrder({
                        method_id: METHOD_ID
                    });
                } else {
                    Frames.unblockFields();
                }

                return false;
            }
        });
    }
);
