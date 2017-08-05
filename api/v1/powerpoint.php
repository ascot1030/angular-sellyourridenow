<?php 
	include_once '../libs/PhpPresentation/Autoloader.php';
	include_once '../libs/Common/Autoloader.php';
 	\PhpOffice\PhpPresentation\Autoloader::register();
 	\PhpOffice\Common\Autoloader::register();
	use PhpOffice\PhpPresentation\PhpPresentation;
 	use PhpOffice\PhpPresentation\IOFactory;
 	use PhpOffice\PhpPresentation\Style\Color;
 	use PhpOffice\PhpPresentation\Style\Alignment;
 	use	PhpOffice\Common\XMLWriter;

	function buildPresentation($projectId){

//		require_once '../libs/PhpPresentation/Autoloader.php';
//		\PhpOffice\PhpPresentation\Autoloader::register();

		$objPHPPresentation = new PhpPresentation();
    		$currentSlide = $objPHPPresentation->getActiveSlide();
		

    	$db = new DbHandler();
    	$slides = $db->getFullRecords("SELECT * FROM slide_table WHERE projectId=$projectId ORDER BY section,slideOrder");
    	$result = $db->getOneRecord("SELECT title FROM project_table WHERE id=$projectId");
    	$projectName = $result['title'];

    	for($i = 0; $i < count($slides) ; $i++){
	    	$shape = $currentSlide->createRichTextShape()
				->setHeight(768)
				->setWidth(900)
				->setOffsetX(30)
				->setOffsetY(300);
			$shape->getActiveParagraph()->getAlignment()->setHorizontal( Alignment::HORIZONTAL_CENTER );
			$textRun = $shape->createTextRun($slides[$i]['content']);
			$textRun->getFont()
				->setName('Arial')
				->setSize(30)
				->setColor( new Color( '00000000' ) );
			$currentSlide = $objPHPPresentation->createSlide();
		}
		$oWriterPPTX = IOFactory::createWriter($objPHPPresentation, 'PowerPoint2007');
		$oWriterPPTX->save("$projectName.pptx");

		echo "<html><body><a href='$projectName.pptx' id='ppt_download' download><script>document.getElementById('ppt_download').click();</script></body></html>";
	}
?>