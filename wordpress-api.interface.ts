

export interface UserCreate {
    username: string; // Login name for the user. Required: 1
    name?: string; // 	Display name for the user.
    first_name?: string; // First name for the user.
    last_name?: string; // Last name for the user.
    email: string; // The email address for the user. Required: 1
    url?: string; // URL of the user.
    description?: string; // Description of the user.
    locale?: string; // Locale for the user. One of: , en_US
    nickname?: string; // The nickname for the user.
    slug?: string; // An alphanumeric identifier for the user.
    roles?: string; // Roles assigned to the user.
    password: string; // Password for the user (never included). Required: 1
    meta?: string; // Meta fields.
}

export interface UserUpdate {
    id?: number;      // user id
    username?: string; // Login name for the user. Required: 1
    name?: string; // 	Display name for the user.
    first_name?: string; // First name for the user.
    last_name?: string; // Last name for the user.
    email?: string; // The email address for the user. Required: 1
    url?: string; // URL of the user.
    description?: string; // Description of the user.
    locale?: string; // Locale for the user. One of: , en_US
    nickname?: string; // The nickname for the user.
    slug?: string; // An alphanumeric identifier for the user.
    roles?: string; // Roles assigned to the user.
    password?: string; // Password for the user (never included). Required: 1
    meta?: string; // Meta fields.
}

export interface UserResponse {
    avatar_urls: {};
    capabilities: {};
    description: string;
    email: string;
    extra_capabilities: {};
    first_name: string;
    id: number;
    last_name: string;
    link: string;
    locale: string;
    meta: Array<any>;
    name: string;
    nickname: string;
    register_date: string;
    roles: Array<string>;
    security_code: string;
    slug: string;
    url: string;
    username: string;
    _links: {};
}


export interface PostCreate {
    date?: string; // The date the object was published, in the site's timezone.
    date_gmt?: string; // The date the object was published, as GMT.
    slug?: string; // An alphanumeric identifier for the object unique to its type.
    status?: string; // A named status for the object. One of: publish, future, draft, pending, private
    password?: string; // A password to protect access to the content and excerpt.
    title?: string; // The title for the object.
    content?: string; // The content for the object.
    author?: string; // The ID for the author of the object.
    excerpt?: string; // The excerpt for the object.
    featured_media?: string; // The ID of the featured media for the object.
    comment_status?: string; // Whether or not comments are open on the object. One of: open, closed
    ping_status?: string; // Whether or not the object can be pinged. One of: open, closed
    format?: string; // The format for the object. One of: standard, aside, chat, gallery, link, image, quote, status, video, audio
    meta?: string; // Meta fields.
    sticky?: string; // Whether or not the object should be treated as sticky.
    template?: string; // The theme file to use to display the object. One of:
    categories?: Array<string>; // The terms assigned to the object in the category taxonomy.
    tags?: string; // The terms assigned to the object in the post_tag taxonomy.
}

export interface Post {
    id: number;
    date: string;
    date_gmt: string;
    guid: string;
    modified: string;
    modified_gmt: string;
    slug: string;
    status: string;
    type: string;
    link: string;
    title: {
        rendered: string;
    };
    content: {
        rendered: string;
    };
    excerpt: string;
    protected: boolean;
    author: number;
    featured_media: number;
    comment_status: string;
    ping_status: string;
    sticky: boolean;
    template: string;
    format: string;
    meta: Array<any>;
    categories: Array<number>;
    tags: Array<string>;
    _links: any;
}
export type Posts = Array<Post>;

export interface WordpressApiConfig {
    url: string;
}

export interface WordpressApiError {
    code: string;
    message: string;
}


export interface Category {
    id: number;
    count: number;
    description: string;
    link: string;
    name: string;
    slug: string;
    taxonomy: string;
    parent: number;
    meta: Array<any>;   // Not avaiable on `getSystemSettings()`
    _links: any;        // Not avaiable on `getSystemSettings()`
}
export type Categories = Array<Category>;


export interface SystemSettings {
    max_sites: number;
    max_domains: number;
    categories: Categories;
}



export interface Site {
    idx?: number;
    domain?: string;        // Needed to create a site.
    name: string;
    description?: string;
}


export interface MySites {
    max_domains: number;
    max_sites: number;
    available_no_of_domains: number;
    available_no_of_sites: number;
    sites: Array<Site>;
}








