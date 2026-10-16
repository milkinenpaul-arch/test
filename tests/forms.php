<?php
/* Contract tests: no WordPress mail transport or network is invoked. */
define('ABSPATH', __DIR__); define('DAY_IN_SECONDS', 86400); define('HOUR_IN_SECONDS', 3600); define('MINUTE_IN_SECONDS', 60);
class JsonResponse extends Exception { public $success; public $data; public $status; function __construct($success, $data, $status) { $this->success=$success; $this->data=$data; $this->status=$status; } }
function wp_send_json_success($data, $status=200) { throw new JsonResponse(true,$data,$status); }
function wp_send_json_error($data, $status=200) { throw new JsonResponse(false,$data,$status); }
$GLOBALS['actions']=array(); function add_action($name,$callback) {$GLOBALS['actions'][$name][]=$callback;} function nocache_headers() {} function home_url() {return 'https://sales.datatour.by';}
function wp_salt() { return 'unit-test-only-salt'; }
function wp_create_nonce($action) {return 'valid-nonce';}
function wp_verify_nonce($nonce,$action) {return $nonce==='valid-nonce';}
function wp_unslash($s) {return stripslashes($s);}
function sanitize_text_field($s) {return trim(strip_tags($s));}
function sanitize_textarea_field($s) {return trim(strip_tags($s));}
function is_email($s) {return filter_var($s,FILTER_VALIDATE_EMAIL)!==false;}
function current_user_can() {return !empty($GLOBALS['is_admin']);}
$GLOBALS['options']=array();$GLOBALS['rates']=array();$GLOBALS['mail_calls']=0;$GLOBALS['mail_ok']=true;
function get_option($k,$default=false) {return isset($GLOBALS['options'][$k])?$GLOBALS['options'][$k]:$default;}
function add_option($k,$v) {if(isset($GLOBALS['options'][$k]))return false;$GLOBALS['options'][$k]=$v;return true;}
function update_option($k,$v) {$GLOBALS['options'][$k]=$v;return true;}
function delete_option($k) {unset($GLOBALS['options'][$k]);}
function get_transient($k) {return isset($GLOBALS['rates'][$k])?$GLOBALS['rates'][$k]:false;}
function set_transient($k,$v) {$GLOBALS['rates'][$k]=$v;}
function wp_mail($to,$subject,$body,$headers) {expect(dtbf26compat_find_lead($_POST['requestId'])>0,'Mail ran before durable storage');$GLOBALS['mail_calls']++;$GLOBALS['last_mail']=array($to,$subject,$body,$headers);return $GLOBALS['mail_ok'];}
// A small database double verifies ordering, failure handling and persistence across retries.
$GLOBALS['posts']=array();$GLOBALS['meta']=array();$GLOBALS['storage_ok']=true;
class WP_Error {}
function is_wp_error($value) {return $value instanceof WP_Error;}
function wp_json_encode($value,$flags=0) {return json_encode($value,$flags);}
function wp_slash($value) {return addslashes($value);}
function wp_insert_post($post,$error=false) {
 if(!$GLOBALS['storage_ok'])return new WP_Error;
 $id=count($GLOBALS['posts'])+1;$post['ID']=$id;$post['post_content']=stripslashes($post['post_content']);
 if(empty($GLOBALS['is_admin']))$post['post_content']=str_replace('&','&amp;',$post['post_content']);
 if(!empty($GLOBALS['corrupt_storage']))$post['post_content']='incomplete';
 $GLOBALS['posts'][$id]=(object)$post;return $id;
}
function get_post($id) {return isset($GLOBALS['posts'][$id])?$GLOBALS['posts'][$id]:null;}
function wp_delete_post($id,$force=false) {unset($GLOBALS['posts'][$id]);}
function update_post_meta($id,$key,$value) {$GLOBALS['meta'][$id][$key]=$value;return true;}
function get_post_meta($id,$key,$single=true) {return isset($GLOBALS['meta'][$id][$key])?$GLOBALS['meta'][$id][$key]:'';}
function get_posts($args) {
 $ids=array();foreach($GLOBALS['posts'] as $id=>$post) {
  if($post->post_type===$args['post_type'] && $post->post_status===$args['post_status'] && $post->post_name===$args['name'])$ids[]=$id;
 }return array_slice($ids,0,1);
}
function register_post_type($name,$args) {$GLOBALS['post_types'][$name]=$args;}
function wp_next_scheduled() {return true;}
function wp_schedule_event() {}
class AdminDenied extends Exception {}
function wp_die($message='',$title='',$args=array()) {throw new AdminDenied($message,isset($args['response'])?$args['response']:500);}
function admin_url($path='') {return 'https://sales.datatour.by/wp-admin/'.$path;}
function absint($value) {return abs((int)$value);}
function esc_html($value) {return htmlspecialchars((string)$value,ENT_QUOTES,'UTF-8');}
function esc_url($value) {return esc_html($value);}
function dtbf26compat_config(){return json_decode(file_get_contents(__DIR__.'/../datatour-bf26-config.json'),true);}
require __DIR__.'/../wordpress/datatour-bf26-compatible/telegram.php';
require __DIR__.'/../wordpress/datatour-bf26-compatible/leads.php';
$_SERVER=array('REQUEST_METHOD'=>'POST','REMOTE_ADDR'=>'192.0.2.1','HTTP_ORIGIN'=>'https://sales.datatour.by');
function payload($extra=array()) {$issued=time()-4;return array_merge(array('nonce'=>'valid-nonce','issued'=>(string)$issued,'token'=>hash_hmac('sha256',$issued.'|valid-nonce',wp_salt()),'website'=>'','contact'=>'test@example.com','consent'=>'1','purpose'=>'selection','season'=>'summer','adults'=>'2','children'=>'0','ages'=>'','requestId'=>'unit-test-request-00000001','source'=>'contract-test','scenario'=>'all','budgetLevel'=>'all','hotelId'=>'','wishes'=>'Test only'),$extra);}
function call_submit($p){$_POST=$p;try{dtbf26compat_submit();throw new Exception('Handler returned without JSON');}catch(JsonResponse $r){return $r;}}
function expect($condition,$message){if(!$condition)throw new Exception($message);}
$cases=0;
function rejected($extra,$code){$before=$GLOBALS['mail_calls'];$stored=count($GLOBALS['posts']);$r=call_submit(payload($extra));expect(!$r->success&&$r->data['code']===$code,'Wrong rejection: '.$code);expect($GLOBALS['mail_calls']===$before,'Rejected request attempted mail');expect(count($GLOBALS['posts'])===$stored,'Rejected request stored a lead');$GLOBALS['cases']++;}
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
expect($r->success&&$r->data['deliveryStatus']==='saved_in_wordpress' && $r->data['emailStatus']==='accepted_by_wp_mail','Valid submission rejected');expect($GLOBALS['mail_calls']===1,'Expected one mail call');
expect($GLOBALS['last_mail'][0]==='datatour78@mail.ru','Wrong recipient');expect(strpos($GLOBALS['last_mail'][2],'IC HOTELS')!==false,'Selected network not resolved on server');expect(strpos($GLOBALS['last_mail'][2],'Forged label')===false,'Client hotel label trusted');expect(strpos($GLOBALS['last_mail'][2],'utm_campaign: bf2026')!==false,'UTM missing');$cases++;
$r=call_submit(payload(array('children'=>'1','ages'=>'14','hotelId'=>'priority-26','utm_campaign'=>'bf2026')));expect($r->success&&!empty($r->data['duplicate'])&&$GLOBALS['mail_calls']===1,'Duplicate caused another mail');$cases++;
$GLOBALS['mail_ok']=false;
$r=call_submit(payload(array('requestId'=>'unit-test-request-00000002')));expect($r->success&&$r->data['storageStatus']==='saved'&&$r->data['emailStatus']==='failed','Mail failure lost a saved lead');$cases++;
$r=call_submit(payload(array('requestId'=>'unit-test-request-00000002')));expect($r->success&&!empty($r->data['duplicate'])&&$GLOBALS['mail_calls']===2,'Saved request unexpectedly mailed again');$cases++;
$GLOBALS['mail_ok']=true;
$r=call_submit(payload(array('requestId'=>'unit-test-request-00000004','formVariant'=>'quick','contact'=>'+375291234567','name'=>'Турист','email'=>'traveller@example.com','hotelId'=>'priority-21','scenario'=>'family','budgetAmount'=>'3000 EUR')));
expect($r->success,'Quick form rejected');
expect(strpos($GLOBALS['last_mail'][2],'Имя: Турист')!==false && strpos($GLOBALS['last_mail'][2],'Email: traveller@example.com')!==false,'Optional name/email missing');
expect(strpos($GLOBALS['last_mail'][2],'LONICERA HOTELS')!==false && strpos($GLOBALS['last_mail'][2],'Сценарий: family')!==false && strpos($GLOBALS['last_mail'][2],'Бюджет: 3000 EUR')!==false,'Hidden selection lost');
expect(in_array('Reply-To: traveller@example.com',$GLOBALS['last_mail'][3]),'Optional validated email not used for reply');$cases++;
$rate_key='dtbf26_rate_'.hash_hmac('sha256',$_SERVER['REMOTE_ADDR'],wp_salt());$GLOBALS['rates'][$rate_key]=6;
rejected(array('requestId'=>'unit-test-request-00000003'),'rate_limit');
// Durable deduplication survives expiry of the transient request option.
$id='unit-test-request-00000004';$saved=dtbf26compat_find_lead($id);$before=count($GLOBALS['posts']);$mails=$GLOBALS['mail_calls'];
delete_option('dtbf26_req_'.hash('sha256',$id));
$r=call_submit(payload(array('requestId'=>$id)));
expect($r->success&&!empty($r->data['duplicate'])&&count($GLOBALS['posts'])===$before&&$GLOBALS['mail_calls']===$mails,'Expired lock duplicated a saved lead');$cases++;
// Database failure must produce an error and never try to send email; a retry can recover.
$GLOBALS['rates']=array();$GLOBALS['storage_ok']=false;
rejected(array('requestId'=>'unit-test-request-db-failure'),'storage_failed');
expect(get_option('dtbf26_req_'.hash('sha256','unit-test-request-db-failure'))===false,'Failed insert left a stale lock');
$GLOBALS['storage_ok']=true;$r=call_submit(payload(array('requestId'=>'unit-test-request-db-failure')));expect($r->success,'Storage failure prevented retry');$cases++;
$GLOBALS['corrupt_storage']=true;
rejected(array('requestId'=>'unit-test-request-db-corruption'),'storage_failed');$GLOBALS['corrupt_storage']=false;
// Anonymous WordPress content filters must not alter ampersands or quoted wishes.
$GLOBALS['rates']=array();
$r=call_submit(payload(array('requestId'=>'unit-test-request-anonymous-amp','wishes'=>'Море & отдых; кафе «A & B»')));
$id=dtbf26compat_find_lead('unit-test-request-anonymous-amp');$stored=json_decode(get_post($id)->post_content,true);
expect($r->success && $stored['fields']['Пожелания']==='Море & отдых; кафе «A & B»','Anonymous content filters changed stored wishes');$cases++;
// Exact round-trip of Unicode, quotes, slashes, multiline wishes and all selection fields.
$GLOBALS['rates']=array();$GLOBALS['is_admin']=true;
$wishes="ТЕСТ — Павел: \"кавычки\", путь C:\\Tours\\2027\nВторая строка";
$r=call_submit(payload(array('requestId'=>'unit-test-request-roundtrip','wishes'=>$wishes,'test'=>'1','direction'=>'Китай · Хайнань','period'=>'май','duration'=>'10 ночей','budgetAmount'=>'5000 BYN')));
$id=dtbf26compat_find_lead('unit-test-request-roundtrip');$data=json_decode(get_post($id)->post_content,true);
expect($data['fields']['Пожелания']===sanitize_textarea_field(wp_unslash($wishes)) && $data['fields']['Направление']==='Китай · Хайнань' && $data['test']===true,'Saved fields changed or test marker lost');$cases++;
foreach($GLOBALS['actions']['init'] as $callback)$callback();
$type=$GLOBALS['post_types']['dtbf26_lead'];
expect(!$type['public']&&!$type['publicly_queryable']&&!$type['show_in_rest']&&$type['exclude_from_search']&&!$type['can_export'],'Leads can leak through public WordPress routes');
foreach($type['capabilities'] as $cap)expect($cap==='manage_options','Non-admin capability exposes a lead');$cases++;
$GLOBALS['is_admin']=false;$_GET=array('lead'=>$id);
try{dtbf26compat_leads_admin();throw new Exception('Non-admin accessed lead details');}catch(AdminDenied $e){expect($e->getCode()===403,'Wrong admin denial');}$cases++;
$GLOBALS['is_admin']=true;ob_start();dtbf26compat_leads_admin();$detail=ob_get_clean();
expect(strpos($detail,'Заявка №'.$id)!==false&&strpos($detail,'Китай · Хайнань')!==false&&strpos($detail,'Сохранена в WordPress')!==false,'Admin cannot view saved details');$cases++;
// Every new customer-favourite ID must resolve on the server, without trusting client labels.
foreach(dtbf26compat_config()['datatour_choice_hotels'] as $hotel){
 $GLOBALS['rates']=array();
 $r=call_submit(payload(array('requestId'=>'choice-contract-request-'.$hotel['id'],'hotelId'=>$hotel['id'],'hotelLabel'=>'Forged name','source'=>'datatour-choice')));
 $id=dtbf26compat_find_lead('choice-contract-request-'.$hotel['id']);$data=json_decode(get_post($id)->post_content,true);
 expect($r->success && $data['fields']['Отель или сеть']===$hotel['name'] && strpos($GLOBALS['last_mail'][2],'Forged name')===false,'Favourite hotel not resolved on server');
}
$cases++;$GLOBALS['rates']=array();rejected(array('hotelId'=>'choice-999'),'invalid_hotel');
echo 'PASS: '.$cases.' server contracts; consent, nonce, contact, ages, origin, hotel lookup, durable storage, independent email status, storage failure, admin-only access, idempotency and rate limit. No real mail sent.'.PHP_EOL;
