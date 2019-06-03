<?php

namespace CheckoutCom\Magento2\Model\Service;

class MadaHandlerService
{

    /**
     * @var Reader
     */
    protected $directoryReader;

    /**
     * @var Csv
     */
    protected $csvParser;

    /**
     * @var Config
     */
    protected $config;

    /**
     * @var Logger
     */
    protected $logger;

    /**
     * @param Context $context
     */
    public function __construct(
        \Magento\Framework\Module\Dir\Reader $directoryReader,
        \Magento\Framework\File\Csv $csvParser,
        \CheckoutCom\Magento2\Gateway\Config\Config $config,
        \CheckoutCom\Magento2\Helper\Logger $logger
    )
    {
    	$this->directoryReader = $directoryReader;
    	$this->csvParser = $csvParser;
        $this->config = $config;
        $this->logger = $logger;

    }

    /**
     * Returns the Mada CSV path
     *
     * @return string
     */
    private function getCsvPath() {
        try {
            // Get the MADA file name
            $file = ($this->config->isLive()) ? 'mada_live_file' : 'mada_test_file';

            // Get the MADA file path
            $path = $this->config->getValue($file);

            return $this->directoryReader->getModuleDir('', 
                'CheckoutCom_Magento2'
            ) . '/' . $path;
        } catch (\Exception $e) {
            $this->logger->write($e->getMessage());
            return '';
        }   
    }

    /**
     * Checks the MADA BIN
     *
     * @return bool
     */
    public function isMadaBin($bin) {
        try {
            // Set the root path
            $csvPath = $this->getCsvPath();

            // Get the data
            $csvData = $this->csvParser->getData($csvPath);

            // Remove the first row of csv columns
            unset($csvData[0]);

            // Build the MADA BIN array
            $binArray = [];
            foreach ($csvData as $row) {
                $binArray[] = $row[1];
            }
            
            return in_array($bin, $binArray);
        } catch (\Exception $e) {
            $this->logger->write($e->getMessage());
            return false;
        }   
    }
}