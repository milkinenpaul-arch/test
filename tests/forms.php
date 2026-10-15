<?php
/* Contract tests: no WordPress mail transport or network is invoked. */
define('ABSPATH', __DIR__); define('DAY_IN_SECONDS', 86400); define('HOUR_IN_SECONDS', 3600); define('MINUTE_IN_SECONDS', 60);
class JsonResponse extends Exception { public $success; public $data; public $status; function __construct($success, $data, $status) { $this->success=$success; $this->data=$data; $this->status=$status; } }
function wp_send_json_success($data, $status=200) { throw new JsonResponse(true,$data,$status); }
function wp_send_json_error($data, $status=200) { throw new JsonResponse(false,$data,$status); }
function add_action() {} function nocache_headers() {} function home_url() {return 'https://sales.datatour.by';}
function wp_salt() { return 'unit-test-only-salt'; }
function wp_create_nonce($action) {return 'valid-nonce';}
function wp_verify_nonce($nonce,$action) {return $nonce==='valid-nonce';}
function wp_unslash($s) {return stripslashes($s);}
function sanitize_text_field($s) {return trim(strip_tags($s));}
function sanitize_textarea_field($s) {return trim(strip_tags($s));}
function is_email($s) {return filter_var($s,FILTER_VALIDATE_EMAIL)!==false;}
function current_user_can() {return false;}
$GLOBALS['options']=array();$GLOBALS['rates']=array();$GLOBALS['mail_calls']=0;$GLOBALS['mail_ok']=true;
function get_option($k,$default=false) {return isset($GLOBALS['options'][$k])?$GLOBALS['options'][$k]:$default;}
function add_option($k,$v) {if(isset($GLOBALS['options'][$k]))return false;$GLOBALS['options'][$k]=$v;return true;}
function update_option($k,$v) {$GLOBALS['options'][$k]=$v;return true;}
function delete_option($k) {unset($GLOBALS['options'][$k]);}
function get_transient($k) {return isset($GLOBALS['rates'][$k])?$GLOBALS['rates'][$k]:false;}
function set_transient($k,$v) {$GLOBALS['rates'][$k]=$v;}
function wp_mail($to,$subject,$body,$headers) {$GLOBALS['mail_calls']++;$GLOBALS['last_mail']=array($to,$subject,$body,$headers);return $GLOBALS['mail_ok'];}
function dtbf26compat_config(){return json_decode(file_get_contents(__DIR__.'/../datatour-bf26-config.json'),true);}
require __DIR__.'/../wordpress/datatour-bf26-compatible/leads.php';
$_SERVER=array('REQUEST_METHOD'=>'POST','REMOTE_ADDR'=>'192.0.2.1','HTTP_ORIGIN'=>'https://sales.datatour.by');
function payload($extra=array()) {$issued=time()-4;return array_merge(array('nonce'=>'valid-nonce','issued'=>(string)$issued,'token'=>hash_hmac('sha256',$issued.'|valid-nonce',wp_salt()),'website'=>'','contact'=>'test@example.com','consent'=>'1','purpose'=>'selection','season'=>'summer','adults'=>'2','children'=>'0','ages'=>'','requestId'=>'unit-test-request-00000001','source'=>'contract-test','scenario'=>'all','budgetLevel'=>'all','hotelId'=>'','wishes'=>'Test only'),$extra);}
function call_submit($p){$_POST=$p;try{dtbf26compat_submit();throw new Exception('Handler returned without JSON');}catch(JsonResponse $r){return $r;}}
function expect($condition,$message){if(!$condition)throw new Exception($message);}
$cases=0;
function rejected($extra,$code){$before=$GLOBALS['mail_calls'];$r=call_submit(payload($extra));expect(!$r->success&&$r->data['code']===$code,'Wrong rejection: '.$code);expect($GLOBALS['mail_calls']===$before,'Rejected request attempted mail');$GLOBALS['cases']++;}
rejected(array('consent'=>''),'consent_required');
rejected(array('contact'=>'not-a-contact'),'invalid_contact');
rejected(array('formVariant'=>'quick','contact'=>'test@example.com'),'invalid_contact');
rejected(array('formVariant'=>'quick','contact'=>'+375291234567','email'=>'not-an-email'),'invalid_email');
rejected(array('name'=>array('forged')),'invalid_field');
rejected(array('nonce'=>'wrong'),'expired_context');
rejected(array('token'=>str_repeat('0',64)),'expired_context');
rejected(array('website'=>'spam.example'),'spam_check');
rejected(array('adults'=>'0'),'invalid_travelers');
rejected(array('children'=>'2','ages'=>'14'),'invalid_ages');
rejected(array('children'=>'1','ages'=>'19'),'invalid_ages');
rejected(array('children'=>'1','ages'=>'-1'),'invalid_ages');
rejected(array('children'=>'2','ages'=>'2.5'),'invalid_ages');
rejected(array('hotelId'=>'arbitrary-hotel'),'invalid_hotel');
rejected(array('scenario'=>'invented'),'invalid_selection');
rejected(array('contact'=>array('test@example.com')),'invalid_field');
$_SERVER['HTTP_ORIGIN']='https://other.example';rejected(array(),'invalid_origin');$_SERVER['HTTP_ORIGIN']='https://sales.datatour.by';
$r=call_submit(payload(array('children'=>'1','ages'=>'14','hotelId'=>'priority-26','hotelLabel'=>'Forged label','utm_campaign'=>'bf2026')));
expect($r->success&&$r->data['deliveryStatus']==='accepted_by_wp_mail','Valid submission rejected');expect($GLOBALS['mail_calls']===1,'Expected one mail call');
expect($GLOBALS['last_mail'][0]==='datatour78@mail.ru','Wrong recipient');expect(strpos($GLOBALS['last_mail'][2],'IC HOTELS')!==false,'Selected network not resolved on server');expect(strpos($GLOBALS['last_mail'][2],'Forged label')===false,'Client hotel label trusted');expect(strpos($GLOBALS['last_mail'][2],'utm_campaign: bf2026')!==false,'UTM missing');$cases++;
$r=call_submit(payload(array('children'=>'1','ages'=>'14','hotelId'=>'priority-26','utm_campaign'=>'bf2026')));expect($r->success&&!empty($r->data['duplicate'])&&$GLOBALS['mail_calls']===1,'Duplicate caused another mail');$cases++;
$GLOBALS['mail_ok']=false;
$r=call_submit(payload(array('requestId'=>'unit-test-request-00000002')));expect(!$r->success&&$r->data['code']==='mail_failed','Mail failure reported as success');$cases++;
$r=call_submit(payload(array('requestId'=>'unit-test-request-00000002')));expect(!$r->success&&$GLOBALS['mail_calls']===2,'Failed request unexpectedly mailed again');$cases++;
$GLOBALS['mail_ok']=true;
$r=call_submit(payload(array('requestId'=>'unit-test-request-00000004','formVariant'=>'quick','contact'=>'+375291234567','name'=>'Турист','email'=>'traveller@example.com','hotelId'=>'priority-21','scenario'=>'family','budgetAmount'=>'3000 EUR')));
expect($r->success,'Quick form rejected');
expect(strpos($GLOBALS['last_mail'][2],'Имя: Турист')!==false && strpos($GLOBALS['last_mail'][2],'Email: traveller@example.com')!==false,'Optional name/email missing');
expect(strpos($GLOBALS['last_mail'][2],'LONICERA HOTELS')!==false && strpos($GLOBALS['last_mail'][2],'Сценарий: family')!==false && strpos($GLOBALS['last_mail'][2],'Бюджет: 3000 EUR')!==false,'Hidden selection lost');
expect(in_array('Reply-To: traveller@example.com',$GLOBALS['last_mail'][3]),'Optional validated email not used for reply');$cases++;
$rate_key='dtbf26_rate_'.hash_hmac('sha256',$_SERVER['REMOTE_ADDR'],wp_salt());$GLOBALS['rates'][$rate_key]=6;
rejected(array('requestId'=>'unit-test-request-00000003'),'rate_limit');
echo 'PASS: '.$cases.' server contracts; consent, nonce, contact, ages, origin, hotel lookup, idempotency, mail failure and rate limit. No real mail sent.'.PHP_EOL;
