<?php 
//************************************************GET*****************************************

$app->get('/powerpoint', function() use($app){
    $projectId = $app->request->get('projectId');
    require_once 'powerpoint.php';
    buildPresentation($projectId);
});

$app->get('/print/slides', function() use($app){
    $projectId = $app->request->get('projectId');
    $db = new DbHandler();
    $slides = $db->getFullRecords("SELECT * FROM slide_table WHERE projectId=$projectId ORDER BY section,slideOrder");

    $html = "<!DOCTYPE HTML><html> <head>  <meta name='viewport' content='width=device-width' />  <title>Slides</title> </head> <body> <div>  <h2>Slides</h2>";
    for($i = 0; $i < count($slides) ; $i++){
        $html .= "<p>". $slides[$i]['content'] ."</p>";
    }
    $html .= "</div> </body> </html>";
    echo $html;
});

$app->get('/session', function() {
    $db = new DbHandler();
    $session = $db->getSession();
    $response["uid"] = $session['uid'];
    $response["email"] = $session['email'];
    $response["name"] = $session['name'];
    echoResponse(200, $session);
});

$app->get('/logout', function() {
    $db = new DbHandler();
    $session = $db->destroySession();
    $response["status"] = "info";
    $response["message"] = "Logged out successfully";
    echoResponse(200, $response);
});

$app->get('/member/is-authenticated', function() use ($app) {
    $uuid = $app->request->get('id');
    $db = new DbHandler();
    $db->getSession();
    $response['isAuthenticated'] = $_SESSION['uuid'] == $uuid;
    echoResponse(200, $response);
});


$app->get('/notifications/user/:userId', function ($userId) {
    $db = new DbHandler();
    $notifications = $db->getFullRecords("SELECT id, user_id, note, date FROM notification_table WHERE user_id='$userId'");

    echoResponse(200,$notifications);
});

$app->get('/projects', function () use ($app)  {
    $db = new DbHandler();
    $userId = $app->request->get('userId');

    $projects = $db->getFullRecords("SELECT * FROM project_table WHERE userId='$userId'");

    echoResponse(200,$projects);
});

$app->get('/projects/:id', function ($id) use ($app)  {
    $db = new DbHandler();

    $response = $db->getOneRecord("SELECT * FROM project_table WHERE id='$id'");

    echoResponse(200,$response);
});

$app->get('/slides', function () use ($app)  {
    $db = new DbHandler();
    $projectId = $app->request->get('projectId');

    $slides = $db->getFullRecords("SELECT * FROM slide_table WHERE projectId='$projectId'");
    for($i = 0; $i < count($slides) ; $i ++){
        $slides[$i]['slideOrder'] = intval($slides[$i]['slideOrder']);
    }
    echoResponse(200,$slides);
});



$app->get('/notes', function () use ($app)  {
    $db = new DbHandler();
    $projectId = $app->request->get('projectId');

    $notes = $db->getFullRecords("SELECT * FROM note_table WHERE projectId='$projectId'");

    echoResponse(200,$notes);
});


$app->get('/uuid', function() {
    $db = new DbHandler();
    $session = $db->getSession();
    $response["uid"] = $session['uid'];
    echoResponse(200, $session['uid']);
});


$app->get('/member', function() use ($app) {
    require_once 'passwordHash.php';
    
    $response = array();
    $db = new DbHandler();
    $uuid = $app->request->get('uuid');
    $user = $db->getOneRecord("SELECT uid ,firstName,password,email,created FROM user_table WHERE uid='$uuid'");
    if ($user != NULL) {
    
            $response['id'] = "success";
            $response['firstName'] = $user['firstName'];
            $response['lastName'] = " ";
            $response['id'] = $user['uid'];
            $response['accountId'] = $user['uid'];
            $response['userName'] = $user['email'];
            $response['createdAt'] = $user['created'];

            $result = $db->getFullRecords("SELECT permission FROM permission_table WHERE user_id='$uuid'");
            $permissions = array();
            for($i = 0; $i < count($result); $i++){
                $permissions[] = $result[$i]['permission'];
            }
            $response['permissions'] = $permissions;
            if (!isset($_SESSION)) {
                session_start();
            }
            $_SESSION['uuid'] = $user['uid'];
            $_SESSION['email'] = $user['email'];
            $_SESSION['firstName'] = $user['firstName'];
    }else {
            $response['status'] = "error";
            $response['message'] = 'No such user is registered';
        }
    echoResponse(200, $response);
});



//******************************************POST*******************************************************
$app->post('/login', function() use ($app) {
    require_once 'passwordHash.php';
    $r = json_decode($app->request->getBody());
    verifyRequiredParams(array('userName', 'password'),$r);
    $response = array();
    $db = new DbHandler();
    $password = $r->password;
    $email = $r->userName;
    $user = $db->getOneRecord("SELECT uid ,firstName,password,email,created FROM user_table WHERE phone='$email' or email='$email'");
    if ($user != NULL) {
        if(passwordHash::check_password($user['password'],$password)){
            $response['status'] = "success";
            $response['message'] = 'Logged in successfully.';
            $response['name'] = $user['firstName'];
            $response['sessionId'] = $user['uid'];
            $response['uuid'] = $user['uid'];
            $response['userName'] = $user['email'];
            $response['createdAt'] = $user['created'];
            if (!isset($_SESSION)) {
                session_start();
            }
            $_SESSION['uuid'] = $user['uid'];
            $_SESSION['email'] = $email;
            $_SESSION['name'] = $user['firstName'];
            echoResponse(200, $response);
        } else {
            $response['status'] = "error";
            $response['message'] = 'Login failed. Incorrect credentials';
            echoResponse(401, "error");
        }
    }else {
        $response['status'] = "error";
        $response['message'] = 'No such user is registered';
        echoResponse(401, "error");
    }
});


$app->post('/slides', function () use ($app)  {
    $response = array();
    $r = json_decode($app->request->getBody());
    verifyRequiredParams(array('content', 'editUrl', 'projectId', 'section', 'slideOrder'),$r);
    $db = new DbHandler();
    $r->content = $db->conn->real_escape_string($r->content);
    $r->section = $db->conn->real_escape_string($r->section);
    $column_names = array('content', 'editUrl', 'projectId', 'section', 'slideOrder');
    $table_name = "slide_table";
    $result = "";
    if(isset($r->id) ){
        $id = $r->id;
        $content = $r->content;
        $db->updateRecord("UPDATE slide_table SET content='$content' where id=$id ");
    }
    else{
        $result = $db->insertIntoTable($r, $column_names, $table_name);
    }
    $response['result'] = $result;

    echoResponse(200,$response);
});

$app->post('/slides/reorder', function () use ($app)  {
    $response = array();
    $r = json_decode($app->request->getBody());
    verifyRequiredParams(array('id', 'editUrl', 'projectId',  'slideOrder'),$r);
    $db = new DbHandler();
    $id = $r->id;
    $projectId = $r->projectId;
    $editUrl = $r->editUrl;
    $firstOrder = $r->slideOrder;
    $origin = $db->getOneRecord("SELECT slideOrder FROM slide_table WHERE id=$id");
    $secondOrder = $origin['slideOrder'];

    $db->updateRecord("UPDATE slide_table SET slideOrder=$secondOrder where editUrl = '$editUrl' AND projectId=$projectId AND slideOrder=$firstOrder");
    $db->updateRecord("UPDATE slide_table SET slideOrder=$firstOrder where id=$id ");
    
    $response = $db->getOneRecord("SELECT * FROM slide_table WHERE id=$id");

    echoResponse(200,$response);
});


$app->post('/notes', function () use ($app)  {
    $response = array();
    $r = json_decode($app->request->getBody());
    verifyRequiredParams(array('editUrl', 'noteCategory', 'projectId', 'userNote'),$r);
    $db = new DbHandler();
    $r->userNote = $db->conn->real_escape_string($r->userNote);
    $r->noteCategory = $db->conn->real_escape_string($r->noteCategory);
    $column_names = array('editUrl', 'noteCategory', 'projectId', 'userNote');
    $table_name = "note_table";
    $result = $db->insertIntoTable($r, $column_names, $table_name);

    $response['result'] = $result;

    echoResponse(200,$response);
});

$app->post('/projects', function () use ($app)  {
    $response = array();
    $r = json_decode($app->request->getBody());
    verifyRequiredParams(array('title', 'userId'),$r);
    $db = new DbHandler();
    $r->title = $db->conn->real_escape_string($r->title);
    $column_names = array('title', 'userId');
    $table_name = "project_table";
    $result = $db->insertIntoTable($r, $column_names, $table_name);


    $response = $db->getOneRecord("SELECT * FROM project_table WHERE id='$result'");

    echoResponse(200,$response);
});

$app->post('/project-copy', function() use($app){
    $r = json_decode($app->request->getBody());
    $db = new DbHandler();
    $originalId = $r->originalId;
    $userId = $r->project->userId;
    $newTitle = $db->conn->real_escape_string($r->project->title);

    $newProjectId = $db->insertIntoTable($r->project, array("title","userId"),"project_table");

    $db->runQuery("INSERT INTO slide_table (editUrl,projectId,content,section,slideOrder) SELECT editUrl,$newProjectId as projectId, content, section,slideOrder FROM slide_table WHERE projectId=$originalId");

    $response = $db->getOneRecord("SELECT * FROM project_table WHERE id=$newProjectId");

    echoResponse(200,$response);
});

function randomPassword() {
    $chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    $password = substr( str_shuffle( $chars ), 0, 8 );
    return $password;
}

$app->post('/signup', function() use ($app){
    require_once 'passwordHash.php';
    $response = array();
    $json = json_decode($app->request->getBody());
    //$txt = file_get_contents("debug-input1.data");
    //echo $txt;
    //$json = json_decode($txt);
    $db = new DbHandler();
    $contact = $json->purchase->contact->contact_profile;

    $email = $contact->email;
    $phone  = $contact->phone;
    $firstName = $contact->first_name;
    $lastName = $contact->last_name;
    $address = $contact->address;
    $city = $contact->city;
    $password = randomPassword();
    $isUserExists = $db->getOneRecord("SELECT 1 FROM user_table WHERE phone='$phone' or email='$email'");
    $r = json_decode(json_encode( array(
        "email" => $email, 
        "phone" => $phone,
        "firstName" => $firstName, 
        "lastName" => $lastName, 
        "password" => $password,
        "address" => $address,
        "city" => $city
        )));
    if(!$isUserExists){
        $r->password = passwordHash::hash($password);
        $table_name = "user_table";
        $column_names = array('email', 'phone', 'firstName','lastName', 'password', 'address','city');
        $result = $db->insertIntoTable($r, $column_names, $table_name);

        if ($result != NULL) {
            // Give permissions to new user!
            $db->runQuery("INSERT INTO permission_table( permission, user_id ) SELECT permission, $result AS user_id FROM permission_table WHERE user_id =1");
            // Create new project for new user!
            $db->runQuery("INSERT INTO project_table (title,userId) VALUES ('New Project',$result)");

            $response["status"] = "success";
            $response["message"] = "User account created successfully";
            $response["uid"] = $result;

            // send email
            $msg = "Hi $firstName \n\n Thank you for purchasing our product.\n\n Password : $password \n\n Get started watching the first video to understand how the process works when you first login.\n\n Regards, \n\n Keith Cronin";
            mail("$email","Welcome!",$msg, "From: support@sellyourridenow.com"."\r\n"."Reply-To: support@sellyourridenow.com");

            echoResponse(200, $response);
        } else {
            $response["status"] = "error";
            $response["message"] = "Failed to create customer. Please try again";
            echoResponse(201, $response);
        }
    }
    else{
        $response["status"] = "error";
        $response["message"] = "An user with the provided phone or email exists!";
        echoResponse(201, $response);
    }
});
//***************************************DELETE********************************************


$app->delete('/slides', function () use ($app)  {
    $id = $app->request->get('id');
    $db = new DbHandler();
    $result = $db->getOneRecord("SELECT * FROM slide_table WHERE id='$id'");
    $db->deleteRecord("DELETE FROM slide_table WHERE id='$id'");

    echoResponse(200,$result);
});


$app->delete('/notes', function () use ($app)  {
    $id = $app->request->get('id');
    $db = new DbHandler();
    $db->deleteRecord("DELETE FROM note_table WHERE id='$id'");

    echoResponse(200,true);
});



$app->delete('/projects/:projectId', function ($projectId) {
    $db = new DbHandler();
    $result = $db->deleteRecord("DELETE FROM project_table WHERE id='$projectId'");

    echoResponse(200,$result);
});

?>