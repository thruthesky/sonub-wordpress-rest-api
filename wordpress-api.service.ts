import { Injectable, Inject } from '@angular/core';
import { HttpHeaders, HttpClient, HttpParams, HttpEvent } from '@angular/common/http';
import { tap, catchError } from 'rxjs/operators';
import {
  WordpressApiConfig, UserCreate, UserResponse, UserUpdate, PostCreate,
  WordpressApiError, Categories, Post, Posts, SystemSettings,
  Site,
  Sites,
  DomainAdd
} from './wordpress-api.interface';
import { of, Observable, BehaviorSubject } from 'rxjs';
import { ConfigToken } from './wordpress-api.config';
import { CookieService, CookieOptions } from 'ngx-cookie';



@Injectable()
export class WordpressApiService {

  static memoryCache = {};

  constructor(
    @Inject(ConfigToken) private config: WordpressApiConfig,
    private http: HttpClient,
    private cookie: CookieService
  ) {
    console.log('WordpressApiConfig: config: ', this.config);
    this.doInit();
  }

  doInit() {
    console.log('WordpressApiService::doInit()');
  }

  /**
   * Returns true if the error is equal to the error code.
   * @param e WordpresApiError
   * @param errorCode error code to compare
   */
  is(e: WordpressApiError, errorCode: string) {
    return e && e.code && e.code === errorCode;
  }

  /**
   * Returns true if the input object is an error of HttpClient coming from Backend.
   * @param e 400 (Bad Request) from Wordpress
   *    'e' has a raw http error response from HttpClient.
   *    {
   *      error: { code: ... , message: ... },
   *      message: ...,
   *      HttpErrorResponse: ...,
   *      ... and much more
   *    }
   */
  isBackendRawError(e) {
    if (e && e.error && e.error.code) {
      return true;
    } else {
      return false;
    }
  }

  /**
   * Returns { code: ..., message: .... } Object from Raw Http Error Response
   * @param e raw http error response
   */
  getError(e): WordpressApiError {
    console.log('getError', e);
    if (!e) {
      return { code: 'falsy_error', message: `Error message is falsy. Meaning error object is emtpy.` };
    }
    if (e.name && e.name === 'HttpErrorResponse' && e.status !== void 0 && e.status === 0) {
      return { code: 'server_down_or_no_internet', message: `Check if you have internet. Or somehow you cannot connect to server.` };
    }
    if (this.isBackendRawError(e)) {
      return { code: e.error.code, message: e.error.message };
    }

    return { code: 'unknown_error', message: 'This does look like an error object' };

  }

  // get config(): WordpressApiConfig { return WordpressApiService.config; }
  get url(): string { return this.config.url; }
  get urlWordpressApiEndPoint(): string { return this.url + '/wp-json/wp/v2'; }
  get urlUsers(): string { return this.urlWordpressApiEndPoint + '/users'; }
  get urlPosts(): string { return this.urlWordpressApiEndPoint + '/posts'; }
  get urlCategories(): string { return this.urlWordpressApiEndPoint + '/categories'; }
  get urlSonubApi(): string { return this.url + '/wp-json/sonub/v2019'; }


  /**
   * Use this auth after login
   */
  get loginAuth() {
    return this.getHttpOptions({ user_login: this.myId, user_pass: this.mySecurityCode });
  }

  /**
   * Use this auth to login. After login, use `loginAuth`
   * @param email email
   * @param password password
   */
  private emailPasswordAuth(email, password) {
    return this.getHttpOptions({ user_login: email, user_pass: password });
  }



  /**
   * Returns Http Options
   * @param options options
   * @return any
   *
   * @example
   *  const options = this.getHttpOptions({ user_login: user.username, user_pass: user.password });
   */
  private getHttpOptions(options: {
    user_login: string;
    user_pass: string;
  } = <any>{}) {
    const httpOptions = {
      headers: new HttpHeaders({
        'Authorization': 'Basic ' + btoa(`${options.user_login}:${options.user_pass}`),
        'Content-Type': 'application/json'
      })
    };
    return httpOptions;
  }

  /**
   * This is a wrapper of post which constrcuts a POST request to Wordpress Backend server.
   * @desc The reason for this method is to capture all the request and response for easy use.
   * @param url url
   * @param body body as json
   * @param options http options
   */
  public post<T>(url: string, json: any | null, options?: {
    headers?: HttpHeaders | {
      [header: string]: string | string[];
    };
    observe?: 'body';
    params?: HttpParams | {
      [param: string]: string | string[];
    };
    reportProgress?: boolean;
    responseType?: 'json';
    withCredentials?: boolean;
  }): Observable<T> {
    return this.http.post<T>(url, json, options).pipe(
      catchError(e => { throw this.getError(e); })
    );
  }
  /**
   * This is a wrapper of HttpClient.get() to capture all the request and response for easy use.
   * @param url url
   * @param options http options
   */
  public get<T>(url: string, options?: {
    headers?: HttpHeaders | {
      [header: string]: string | string[];
    };
    observe: 'events';
    params?: HttpParams | {
      [param: string]: string | string[];
    };
    reportProgress?: boolean;
    responseType?: 'json';
    withCredentials?: boolean;
  }): Observable<HttpEvent<T>> {
    console.log('url:', url);
    return this.http.get<T>(url, options).pipe(
      catchError(e => { throw this.getError(e); })
    );
  }

  version(): Observable<string> {
    return <any>this.get(this.urlSonubApi + '/version');
  }

  /**
   * Gets system settings from live server or from cached memory data.
   * @desc since it caches on memory, you can call as many times as you want.
   *    It will response with data from memory.
   *
   * @desc This method gets data from backend server only one time of the app life cyle.
   *    And if it is invoked again, then it simply return data in memory.
   *    Meaning, if though you change domain, it will not affected. It will only return the first domain settgins.
   *
   * @desc settings in localStorage are saved in each domain.
   *
   * @example test code
   *
        this.wp.systemSettings().subscribe(res => res, e => console.error(e));
        setTimeout(() => {this.wp.systemSettings().subscribe(res => res, e => console.error(e));}, 1000);
   * @example this.a.wp.systemSettings().subscribe(s => this.settings = s);
   * @example use case for normal use. Site may need to get site settings as quickly as it can so it can display the theme quickly.
   *  this.wp.systemSettings({ domain: this.wp.currentDomain(), cache: true }).subscribe(res => res,
   *      e => console.error(e));
   *
   * @example root site caching
   *    ; If root site like 'localhost', 'www.sonub.com' has no site settings, still system settings will be saved as cache
   *    ; and will be used on next app booting.
   *    this.wp.systemSettings({ domain: this.wp.currentDomain(), cache: true }).subscribe(...)
   */
  systemSettings(options: { domain?: string; cache?: boolean } = { domain: '', cache: true }): Observable<SystemSettings> {

    /**
     * Returns from memory if cache data exists in memory and return. no other operation.
     */
    const k = 'systemSettings';
    const memoryData = this.getCache(k);
    if (memoryData) {
      console.log('systemSettings() return data from memory: ', memoryData);
      return of(memoryData);
    }




    /**
     * Use localStorage data if exists and then load it from backend.
     */
    let cachedData = null;
    if (options.cache) {
      cachedData = this.getLocalStorage(options.domain); // get cached data
    }
    const subject = new BehaviorSubject(cachedData); // create observable

    /**
     * Returns from backend
     */
    this.get(this.urlSonubApi + `/system-settings?domain=${options.domain}`).pipe(
      tap(data => {
        console.log('systemSettings() return data from backend : ', data);
        this.setCache(k, data);
        this.setLocalStorage( options.domain, data);
      })
    ).subscribe(res => subject.next(res));


    /**
     * If cache exists in localStroage, use it.
     */
    if (options.cache) {
      const re = this.getLocalStorage(options.domain); // 캐시한 데이터를 읽음
      console.log(`systemSettings() return data from localStorage: for (${options.domain})`, re);
    }
    return <any>subject;
  }

  /**
   * Registers
   * @param user User
   * @example
      wp.register({
        username: this.chance.email(),
        password: password,
        email: this.chance.email()
      }).subscribe(res => {
        console.log('user register: ', res);
      });
   */
  register(user: UserCreate) {
    return this.http.post<UserResponse>(this.urlUsers, user).pipe(
      tap(data => this.saveUserData(data))
    );
  }

  /**
   * Login user can update only his user data.
   * @param user User update data
   * @note user cannot change 'username'. But everything else is changable.
   */
  updateProfile(user: UserUpdate) {
    const options = this.getHttpOptions({ user_login: this.myId, user_pass: this.mySecurityCode });
    return this.http.post<UserResponse>(this.urlUsers + '/me', user, options).pipe(
      tap(data => this.saveUserData(data))
    );
  }
  /**
   * Get user data from wordpress via rest api
   * @param auth User auth with email & password.
   * @desc This method can be used to get security code.
   *    If the user didn't logged yet and want to login, you can call this mehtod with email & password auth.
   *    After getting user profile, you can use security code to continue access wordpress rest api.
   */
  profile(auth?): Observable<UserResponse> {
    if (!auth) {
      auth = this.loginAuth;
    }
    return <any>this.get(this.urlSonubApi + '/profile', auth).pipe(
      tap(data => this.saveUserData(<any>data))
    );
  }
  /**
   * Saves user data into cookie or localStorage
   * @param user UserData
   */
  private saveUserData(user: UserResponse) {
    if (this.config.sessionStorage === 'cookie') {
      const d = new Date();
      const options: CookieOptions = {
        domain: this.currentRootDomain(), // current root domain
        expires: new Date(d.getFullYear() + 1, d.getMonth()) // 1 year
      };
      this.cookie.put('user_id', user.id.toString(), options);
      this.cookie.put('user_security_code', user.security_code, options);
      this.cookie.put('user_email', user.email, options);
      this.cookie.put('user_username', user.username, options);
      this.cookie.put('user_nickname', user.nickname, options);
    } else {
      localStorage.setItem('user_id', user.id.toString());
      localStorage.setItem('user_security_code', user.security_code);
      localStorage.setItem('user_email', user.email);
      localStorage.setItem('user_username', user.username);
      localStorage.setItem('user_nickname', user.nickname);
    }
  }


  /**
   * Returns current host name.
   */
  currentDomain(): string {
    return location.hostname;
  }
  /**
   * Returns current root domain based on hostname
   */
  currentRootDomain(): string {
    return this.rootDomain(location.hostname);
  }
  /**
   * Returns root domain only like
   * @example
   *    'abc.com' from 'www.abc.com'
   *    'abc.co.kr' from 'www.abc.co.kr' or 'sub.abc.co.kr'
   *
   * @param domain domain including subdomain
   */
  rootDomain(domain: string) {
    const splitArr = domain.split('.');
    const arrLen = splitArr.length;

    // Extracting the root domain here if there is a subdomain

    // If there are more than 3 parts of domain like below
    // 'www'.'abc'.'com'
    // 'www'.'abc'.'co'.'kr'
    if (arrLen > 2) {
      // Get the last two parts (always)
      domain = splitArr[arrLen - 2] + '.' + splitArr[arrLen - 1];
      // Check to see if it's using a Country Code Top Level Domain (ccTLD) (i.e. ".co.kr")
      // Then get 3rd part as root domain
      if (splitArr[arrLen - 2].length === 2 && splitArr[arrLen - 1].length === 2) {
        // This is using a ccTLD
        domain = splitArr[arrLen - 3] + '.' + domain;
      }
    }
    return domain;
  }


  /**
   * This lets a user login and returns the login user's profile data.
   * @param email email
   * @param password password
   */
  login(email: string, password: string) {
    return this.profile(this.emailPasswordAuth(email, password));
  }

  logout() {
    const d = new Date();
    const options: CookieOptions = {
      domain: this.currentRootDomain(),
      expires: new Date(d.getFullYear() - 1, d.getMonth())
    };
    this.cookie.remove('user_id', options);
    this.cookie.remove('user_security_code', options);
    this.cookie.remove('user_email', options);
    this.cookie.remove('user_username', options);
    this.cookie.remove('user_nickname', options);
    localStorage.removeItem('user_id');
    localStorage.removeItem('user_security_code');
    localStorage.removeItem('user_email');
    localStorage.removeItem('user_username');
    localStorage.removeItem('user_nickname');
  }
  get isLogged() {
    return !!this.myId;
  }

  /**
   * Returns user data saved in localStorage.
   * @param key key sring like 'id', 'email', 'security_code', 'username'
   */
  private getUserData(key) {
    if (this.config.sessionStorage === 'cookie') {
      return this.cookie.get('user_' + key);
    } else {
      return localStorage.getItem('user_' + key);
    }
  }
  get myId() {
    return this.getUserData('id');
  }
  get mySecurityCode() {
    return this.getUserData('security_code');
  }
  get myNickname() {
    return this.getUserData('nickname');
  }


  createPost(post: PostCreate) {
    return this.http.post<Post>(this.urlPosts, post, this.loginAuth);
  }
  getPosts() {
    return this.http.get<Posts>(this.urlPosts, this.loginAuth);
  }

  getCache(code) {
    if (WordpressApiService.memoryCache[code]) {
      return WordpressApiService.memoryCache[code];
    } else {
      return null;
    }
  }

  setCache(code, data) {
    WordpressApiService.memoryCache[code] = data;
  }

  getLocalStorage(key) {
    let data = localStorage.getItem(key);
    if (data) {
      try {
        data = JSON.parse(data);
      } catch (e) {
        alert(`JSON.parse(${key}) error. Please report this to admin as soon as possible.`);
      }

    }
    return data;
  }
  setLocalStorage(key, obj) {
    localStorage.setItem(key, JSON.stringify(obj));
  }

  /**
   * Gets categories.
   * @desc Use this method to know categories.
   * @desc You will need it on pages where categories are needed lik in forum post page.
   * @desc It caches on memory.
   * @example
   *    wp.categories().subscribe(res => console.log('res: ', res));
   */
  categories(): Observable<Categories> {
    const k = 'categories';
    if (this.getCache(k)) {
      return of(this.getCache(k));
    }
    return this.http.get<Categories>(this.urlCategories, this.loginAuth).pipe(
      tap(data => this.setCache(k, data))
    );
  }



  sites(): Observable<Sites> {
    return this.http.get<Sites>(this.urlSonubApi + '/sites', this.loginAuth);
  }

  site(idx_site): Observable<Site> {
    return this.http.post<Site>(this.urlSonubApi + '/site', { idx_site: idx_site }, this.loginAuth);
  }


  createSite(data: Site): Observable<Site> {
    return this.http.post<Site>(this.urlSonubApi + '/create-site', data, this.loginAuth);
  }
  updateSite(form: Site): Observable<Site> {
    return this.http.post<Site>(this.urlSonubApi + '/update-site', form, this.loginAuth);
  }


  addDomain(data: DomainAdd): Observable<DomainAdd> {
    return this.http.post<DomainAdd>(this.urlSonubApi + '/add-domain', data, this.loginAuth);
  }
  deleteDomain(domain: string): Observable<Site> {
    return this.http.post<Site>(this.urlSonubApi + '/delete-domain', { domain: domain }, this.loginAuth);
  }

}
