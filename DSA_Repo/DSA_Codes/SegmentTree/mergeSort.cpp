// instead of storing the property value at node we are storing the actual range
// as then all the things which can be applied at the array can be applied over here
// space compleity will be O(Nlog(N));

// building will take O(Nlog(N))

// queries and update depend on what kind of data structure we are maiantaing

// k query
// for querying i had solution both for O(q*log(n)*log(n));
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
 
vector<int>fac(100004,1);
int MOD(int a,int b){
     return (1LL*a*b)%M;
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
int cnr(int n,int r){
     if(r>n) return 0;
     int num=fac[n];
     int den=MOD(fac[n-r],fac[r]);
     den=bnr(den,M-2);
     return MOD(num,den);
}
ll modAdd(ll a,ll b){
     return (a+b)%M;
}
ll modMul(ll a,ll b){
     return (a*b)%M;
}
ll countSetBit(ll n){
     ll cnt=0;
     for(int i=63;i>=0;i--){
          if(((1LL<<i)&n)!=0) cnt++;
     }
     return cnt;
}

const int N=30010;
vector<vector<int>>segmentTree(4*N);
int lastind[4*N];
class seg{
  public:
     vector<int>merge(vector<int>&a,vector<int>&b){
          int n=a.size(),m=b.size();
          // debug(a);
          // debug(b);
          vector<int>res;
          int i=0,j=0;
          while(i<n && j<m){
               if(a[i]>b[j]){
                    res.pb(b[j++]);
               }
               else{
                    res.pb(a[i++]);
               }
          }
          while(i<n) res.pb(a[i++]);
          while(j<m) res.pb(b[j++]);
          //debug(res);
          return res;
     }
void build(int ind,int l,int r,vector<int>&arr){
      if(l>r){
          return;
       }
     if(l==r){
        // cout<<l<<" "<<r<<endl;
        // cout<<arr[l]<<endl;
        // cout<<ind<<endl;
        segmentTree[ind].pb(arr[l]);
        return;
     }
     
     int mid=(l+r)/2;
     build(2*ind+1,l,mid,arr);
     build(2*ind+2,mid+1,r,arr);
     segmentTree[ind]=merge(segmentTree[2*ind+1],segmentTree[2*ind+2]);

}
int query(int ind,int l,int r,vector<int>&arr,int s,int e,int k){
     if(l>r) return 0;   
     // case 1: No overlap
     if(l>e || s>r) return 0;
     // case 2: Full overlap
     if(l>=s && r<=e){
          int m=segmentTree[ind].size();
          int last=lastind[ind];
          while(last<m && segmentTree[ind][last]<=k) last++;
          lastind[ind]=last;
          return m-(last);
     }
     // case 3: Partial Overlap
     int mid=(l+r)/2;
     return (query(2*ind+2,mid+1,r,arr,s,e,k)+query(ind*2+1,l,mid,arr,s,e,k));
}
};
// Time Compleity of query will be 2*log(N)
// as we can see it was simply finding and adding in between all nodes of
// required in finding the end nodes value
void solve(){
       ll n;
       cin>>n;
       vector<int>a(n);
       for(int i=0;i<n;i++) cin>>a[i];
          seg s;
          s.build(0,0,n-1,a);

       ll q;
       cin>>q;
       vector<vector<int>>queries(q,vector<int>(4,0));

       vector<int>ans(q);
       for(int i=0;i<q;i++){
          int l,r,k;
          cin>>l>>r>>k;
          l--,r--;
          queries[i][0]=l;queries[i][1]=r,queries[i][2]=k;queries[i][3]=i;
       }
      // debug(queries);
       sort(all(queries),[](vector<int>&a,vector<int>&b){
           return a[2]<b[2];
       });
     //  debug(queries);
       for(int i=0;i<q;i++){
          int l=queries[i][0],r=queries[i][1],k=queries[i][2];
          ans[queries[i][3]]=s.query(0,0,n-1,a,l,r,k);
       }
       for(int i=0;i<q;i++) cout<<ans[i]<<endl;
         
     }
int main() {
#ifndef ONLINE_JUDGE
     freopen("Error.txt", "w", stderr);
#endif 
     fastio();
       //for(int i=2;i<=100003;i++) fac[i]=MOD(fac[i-1],i); 
       //solve();
     // ll t;
     // cin>>t;
     // while(t--) 
     solve();
    
}
