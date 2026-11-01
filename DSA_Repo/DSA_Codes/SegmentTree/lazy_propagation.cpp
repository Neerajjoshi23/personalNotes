//                ******************************************************************
//                                    Author: Neeraj Joshi

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
 

vector<int>fac(2,1);
ll MOD(ll a,ll b){
     a%=M;
     b%=M;
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
ll ncr(int n,int r){
     if(r>n) return 0;
     ll num=fac[n];
     ll den=MOD(fac[n-r],fac[r]);
     den=bnr(den,M-2);
     return MOD(num,den);
}
int ADD(int a,int b){
     a%=M;
     b%=M;
     return (1LL*a+b)%M;
}
ll countSetBit(ll n){
     ll cnt=0;
     for(int i=63;i>=0;i--){
          if(((1LL<<i)&n)!=0) cnt++;
     }
     return cnt;
}
ll sqrtH(ll a){
     ll start=1,end=1e10;
     ll ans=-1;
     while(start<=end){
          ll mid=(start+end)/2;
          if(mid<=a/mid){
               ans=mid;
               start=mid+1;
          }
          else end=mid-1;
     }
     return ans;
}

bool sett(ll a,ll b){
     if((a&(1LL<<b))==0) return 0;
     else return 1;
}
void fix(int &a,int ind){
     a=a|(1LL<<ind);
}
void unfix(int &a,int ind){
     a=a&(~(1ll<<ind));
}
const int N=200100;
ll segmentTree[4*N];
ll lazy[4*N];
class seg{
  public:
 
     void pushDown(int l,int r,int ind){
          if(l!=r){
               lazy[2*ind+1]+=lazy[ind];
               lazy[2*ind+2]+=lazy[ind];
           }
          segmentTree[ind]+=1LL*(r-l+1)*lazy[ind];
          lazy[ind]=0;
     }

void build(int ind,int l,int r,vector<int>&arr){
      if(l>r){
          return;
       }
     if(l==r){
        segmentTree[ind]=arr[l];
        return;
     }
     
     int mid=(l+r)/2;
     build(2*ind+1,l,mid,arr);
     build(2*ind+2,mid+1,r,arr);
     segmentTree[ind]=(segmentTree[2*ind+1]+segmentTree[2*ind+2]);
}

void update(int ind,int l,int r,vector<int>&arr,int s,int e,ll new_val){
     if(l>r) return;

     pushDown(l,r,ind); 
       // case 1: No overlap
     if(l>e || s>r) return ;
     // case 2: Full overlap
     if(l>=s && r<=e) {
          lazy[ind]+=new_val;
          pushDown(l,r,ind);
          return;
     }
     // case 3: Partial Overlap
     int mid=(l+r)/2;
     update(2*ind+1,l,mid,arr,s,e,new_val);
     update(2*ind+2,mid+1,r,arr,s,e,new_val);
     segmentTree[ind]=(segmentTree[2*ind+1]+segmentTree[2*ind+2]);
}
ll query(int ind,int l,int r,vector<int>&arr,int s,int e){
     if(l>r) return 0;   
     pushDown(l,r,ind);
     // case 1: No overlap
     if(l>e || s>r) return 0;
     // case 2: Full overlap
     if(l>=s && r<=e) return segmentTree[ind];
     // case 3: Partial Overlap
     int mid=(l+r)/2;
     return (query(2*ind+2,mid+1,r,arr,s,e)+query(ind*2+1,l,mid,arr,s,e));
}
};
void solve(){
    
   ll n,m;
   cin>>n>>m;
   vector<int>a(n),b(m);
   for(int i=0;i<n;i++) cin>>a[i];
   for(int i=0;i<m;i++) cin>>b[i];
   seg s;
   s.build(0,0,n-1,a);
   for(int i=0;i<m;i++){
     ll currBall=s.query(0,0,n-1,a,b[i],b[i]);
     s.update(0,0,n-1,a,b[i],b[i],-currBall);
     ll base=(currBall/n);
     ll rem=(currBall%n);
     s.update(0,0,n-1,a,0,n-1,base);
     int go=min(b[i]+rem,n-1);
     s.update(0,0,n-1,a,b[i]+1,go,1);
     rem-=(n-b[i]-1);
     if(rem>0) s.update(0,0,n-1,a,0,rem-1,1);
   }
   for(int i=0;i<n;i++) cout<<s.query(0,0,n-1,a,i,i)<<" ";
     cout<<nline;

}

int main() {
#ifndef ONLINE_JUDGE
     freopen("Error.txt", "w", stderr);
#endif 
     fastio();  
     //for(int i=1;i<=200010;i++) fac[i]=MOD(fac[i-1],i);

     int t=1;
     //cin>>t;
     while(t--){
          debug(t);
          solve();
     }
}