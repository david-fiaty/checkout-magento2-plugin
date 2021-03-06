<?php
/**
 * Checkout.com Magento 2 Payment module (https://www.checkout.com)
 *
 * Copyright (c) 2017 Checkout.com (https://www.checkout.com)
 * Author: David Fiaty | integration@checkout.com
 *
 * License GNU/GPL V3 https://www.gnu.org/licenses/gpl-3.0.en.html
 */

namespace CheckoutCom\Magento2\Controller\Webhook;

use Magento\Framework\App\Action\Action;
use Magento\Framework\App\Action\Context;
use Magento\Framework\Controller\ResultFactory;
use Magento\Framework\Webapi\Exception as WebException;
use Magento\Framework\Webapi\Rest\Response as WebResponse;
use Magento\Framework\Exception\LocalizedException;
use CheckoutCom\Magento2\Model\Service\CallbackService;
use Exception;

class Callback extends Action {

    /**
     * @var CallbackService
     */
    protected $callbackService;

    /**
     * Callback constructor.
     * @param Context $context
     * @param CallbackService $callbackService
     */
    public function __construct(Context $context, CallbackService $callbackService) {
        parent::__construct($context);

        $this->callbackService = $callbackService;
    }

    /**
     * Handles the controller method.
     *
     * @return \Magento\Framework\Controller\ResultInterface
     * @throws Exception
     */
    public function execute() {
        $response   = $this->resultFactory->create(ResultFactory::TYPE_JSON);

        $data = json_decode(file_get_contents('php://input'), true);

        if($data === null) {
            $response->setHttpResponseCode(WebException::HTTP_BAD_REQUEST);

            return $response;
        }

        $preparedData = [
            'headers' => [
                'Authorization' => $this->getRequest()->getHeader('Authorization'),
            ],
            'response' => $data,
        ];

        try {
            $this->callbackService->setGatewayResponse($preparedData);
            $this->callbackService->run();

            $response->setHttpResponseCode(WebResponse::HTTP_OK);
        }
        catch(LocalizedException $e) {
            $response->setHttpResponseCode(WebException::HTTP_BAD_REQUEST);
            $response->setData(['error_message' => $e->getLogMessage()]);
            $this->messageManager->addErrorMessage($e->getLogMessage());
        }
        catch(Exception $e) {
            $response->setHttpResponseCode(WebException::HTTP_BAD_REQUEST);
            $response->setData(['error_message' => $e->getMessage()]);
            $this->messageManager->addErrorMessage($e->getMessage());
        }

        return $response;
    }
}
