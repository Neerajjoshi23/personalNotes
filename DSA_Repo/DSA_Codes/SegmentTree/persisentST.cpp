// Now this persistent segment tree come into play as let say we have along with update and sum query in range we also have the time 
// at which we are updating and while wanted sum we wanted sum at array state let say t now over but we can do while updating the
// segment tree we will can craete a new segment tree at each timestamp and then wuery at that particular timestamp

// like when we wanted to find number of element less than given charcter k in range [l,r] 
// with pref technique i can find the this in [0,r] etending that what i can do for a given query
// we find number of element in [0,l-1] and [0,r] and then minus

// now creating new segment tree is not efficient so we have only updating the nodes that gone change and maintain a new state
// in this case it gone a take O(log(N)) as we are only effecting the log(N) nodes
// now time compl of creating a new segment tree will be log(N) and overall qlog(N) 
// k query with persisitent tree

#include<bits/stdc++.h>
 
using namespace std;
#define fastio() ios_base::sync_with_stdio(false);cin.tie(NULL);cout.tie(NULL)
#define M 1000000007
#define MOD1 998244353
#define INF 1e18
#define nline "\n"
#define pb push_back
#define ppb pop_back
#define mp make_pair
#define ff first
#define ss second
#define PI 3.141592653589793238462
#define set_bits __builtin_popcountll
#define sz(x) ((int)(x).size())
#define all(x) (x).begin(), (x).end()
 
typedef long long ll;
typedef unsigned long long ull;
typedef long double lld;
// typedef tree<pair<int, int>, null_type, less<pair<int, int>>, rb_tree_tag, tree_order_statistics_node_update > pbds; // find_by_order, order_of_key
 
#ifndef ONLINE_JUDGE
#define debug(x) cerr << #x <<" "; _print(x); cerr << endl;
#else
#define debug(x)
#endif
 
void _print(ll t) {cerr << t;}
void _print(int t) {cerr << t;}
void _print(string t) {cerr << t;}
void _print(char t) {cerr << t;}
void _print(lld t) {cerr << t;}
void _print(double t) {cerr << t;}
void _print(ull t) {cerr << t;}
 
template <class T, class V> void _print(pair <T, V> p);
template <class T> void _print(vector <T> v);
template <class T> void _print(set <T> v);
template <class T, class V> void _print(map <T, V> v);
template <class T> void _print(multiset <T> v);
template <class T, class V> void _print(pair <T, V> p) {cerr << "{"; _print(p.ff); cerr << ","; _print(p.ss); cerr << "}";}
template <class T> void _print(vector <T> v) {cerr << "[ "; for (T i : v) {_print(i); cerr << " ";} cerr << "]";}
template <class T> void _print(set <T> v) {cerr << "[ "; for (T i : v) {_print(i); cerr << " ";} cerr << "]";}
template <class T> void _print(multiset <T> v) {cerr << "[ "; for (T i : v) {_print(i); cerr << " ";} cerr << "]";}
template <class T, class V> void _print(map <T, V> v) {cerr << "[ "; for (auto i : v) {_print(i); cerr << " ";} cerr << "]";}
 
ll MOD(ll a,ll b){
     a%=M,b%=M;
     return(a*b)%M;
}
ll modAdd(ll a,ll b){
      a%=M,b%=M;
     return (a+b)%M;
}
ll bnr(ll a,ll b){
     ll res=1;
     while(b>0){
          if(b&1){
               res=MOD(res,a);
          }
          a=MOD(a,a);
          b>>=1;
     }
     return res;
}
class Node{
public:
     int val;
     Node *left;
     Node *right;
     Node(int val){
          this->val=val;
     }
     Node(Node *&B){
          this->val=B->val;
          this->left=B->left;
          this->right=B->right;
     }
};

class segmentTree{
     public:
          vector<Node*>rootState;

          segmentTree(int n){
               rootState.pb(dummy(0,n-1));
               //debug("hell0");
          }

          void build(int l,int r,int ind,int val){
               Node*prev=rootState.back();
               rootState.pb(buildHelper(l,r,prev,ind,val));
          }

          int queryTree(int l,int r,int time,int s,int e){
                Node *prev=rootState[time];
                return query(l,r,prev,s,e);
          }

          Node* dummy(int l,int r){
                if(l==r) return new Node(0);
                Node *newNode=new Node(0);
                int mid=(l+r)>>1;
                newNode->left=dummy(l,mid);
                newNode->right=dummy(mid+1,r);
                return newNode;
          }
          Node *buildHelper(int l,int r,Node*prev,int ind,int val){
               if(l==r){
                    return new Node(val);
               }
               int mid=(l+r)>>1;
               Node *newNode=new Node(prev);
               if(ind<=mid){
                    newNode->left=buildHelper(l,mid,prev->left,ind,val);
               }
               else{
                    newNode->right=buildHelper(mid+1,r,prev->right,ind,val);
               }
               newNode->val=newNode->left->val+newNode->right->val;
               return newNode;
          }
          int query(int l,int r,Node *root,int s,int e){
               if(l>r || s>e) return 0;

               if(l>e || s>r) return 0;

               else if(s<=l && e>=r) return root->val;

              int mid=(l+r)>>1;
     
              return query(l,mid,root->left,s,e)+query(mid+1,r,root->right,s,e);
                   
          }
};
void solve(){
         int n;
         cin>>n;
         vector<int>a(n);
         for(int i=0;i<n;i++) cin>>a[i];

         vector<pair<int,int>>b;

         for(int i=0;i<n;i++) b.pb({a[i],i});
          sort(all(b));
          map<pair<int,int>,int>mp;
          for(int i=0;i<n;i++) mp[b[i]]=i;
          segmentTree s(n);
          for(int i=0;i<n;i++){
               int pos=mp[{a[i],i}];
               s.build(0,n-1,pos,1);
          }

          int q;
          cin>>q;
          while(q--){
               int l,r,k;
               cin>>l>>r>>k;
               pair<int,int> m={k,n};
               int ind=(upper_bound(all(b),m)-b.begin());
               cout<<s.queryTree(0,n-1,r,ind,n-1)-s.queryTree(0,n-1,l-1,ind,n-1)<<nline;
          }
     }
int main() {
#ifndef ONLINE_JUDGE
     freopen("Error.txt", "w", stderr);
#endif 
     fastio();
 
     solve(); 
    
}
